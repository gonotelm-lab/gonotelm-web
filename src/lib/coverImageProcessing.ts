/**
 * 封面图片的前端预处理：格式/大小校验 + 统一居中裁切为 16:9 并重编码。
 * 校验与裁切窗口是纯函数，canvas 相关逻辑独立在其后，便于在 node 测试环境单测。
 */

export const COVER_ASPECT_RATIO = 16 / 9
/** 与后端约定一致：原始文件最大 2MB，超限直接在前端拒绝。 */
export const MAX_COVER_BYTES = 2 * 1024 * 1024
/**
 * 输出最长边上限：服务端校验单边 ≤ 2048，输出 1920（16:9 即 1920×1080）留余量。
 */
export const MAX_COVER_OUTPUT_EDGE = 1920

export const COVER_MIME_WHITELIST = ['image/jpeg', 'image/png', 'image/webp'] as const
export type CoverMimeType = (typeof COVER_MIME_WHITELIST)[number]

/** 文件选择器的 accept 值：扩展名 + MIME 双保险。 */
export const COVER_INPUT_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

const COVER_EXTENSION_MIME: Record<string, CoverMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export type CoverFileIssue = 'unsupportedType' | 'oversized'

export type CoverFileCheck =
  | { ok: true; mime: CoverMimeType }
  | { ok: false; issue: CoverFileIssue }

/**
 * 只认扩展名与 MIME 白名单的交集。
 * 浏览器的 file.type 可能为空串，也可能与扩展名不符（改后缀上传），
 * 两者皆可用且一致才放行；有嫌疑直接在前端拒绝，不发请求。
 */
export function checkCoverFile(file: File): CoverFileCheck {
  const name = file.name.toLowerCase()
  const dotIndex = name.lastIndexOf('.')
  const extensionMime = dotIndex >= 0 ? COVER_EXTENSION_MIME[name.slice(dotIndex + 1)] : undefined
  const fileMime = (COVER_MIME_WHITELIST as readonly string[]).includes(file.type)
    ? (file.type as CoverMimeType)
    : undefined

  let mime: CoverMimeType | undefined
  if (extensionMime && fileMime) {
    // 扩展名与 MIME 都可用时要求一致；改后缀上传的嫌疑文件直接拒绝。
    if (extensionMime !== fileMime) {
      return { ok: false, issue: 'unsupportedType' }
    }
    mime = fileMime
  } else {
    // file.type 缺失（空串常见）时按扩展名兜底。
    mime = extensionMime ?? fileMime
  }

  if (!mime) {
    return { ok: false, issue: 'unsupportedType' }
  }
  if (file.size <= 0 || file.size > MAX_COVER_BYTES) {
    return { ok: false, issue: 'oversized' }
  }
  return { ok: true, mime }
}

export interface CoverCropRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** 16:9 居中裁切窗口：宽图上下收、高图左右收；已是 16:9 时原样返回。 */
export function computeCoverCrop(width: number, height: number): CoverCropRect {
  let sw = width
  let sh = Math.round(width / COVER_ASPECT_RATIO)
  if (sh > height) {
    sh = height
    sw = Math.min(width, Math.round(height * COVER_ASPECT_RATIO))
  }
  return {
    sx: Math.floor((width - sw) / 2),
    sy: Math.floor((height - sh) / 2),
    sw,
    sh,
  }
}

export class CoverImageValidationError extends Error {
  readonly issue: CoverFileIssue

  constructor(issue: CoverFileIssue) {
    super(`cover image validation failed: ${issue}`)
    this.name = 'CoverImageValidationError'
    this.issue = issue
  }
}

/** 魔数探测窗口：12 字节足够覆盖 jpeg/png/webp 的签名。 */
const COVER_MAGIC_PROBE_BYTES = 12

const asciiAt = (bytes: Uint8Array, offset: number, text: string) =>
  text.split('').every((char, index) => bytes[offset + index] === char.charCodeAt(0))

/**
 * 按文件头魔数识别封面格式；未命中白名单返回 null。
 * - JPEG: FF D8 FF
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - WebP: RIFF....WEBP（0-3 为 RIFF，8-11 为 WEBP）
 */
export function detectCoverMimeFromMagic(head: Uint8Array): CoverMimeType | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    head.length >= 8
    && head[0] === 0x89
    && head[1] === 0x50
    && head[2] === 0x4e
    && head[3] === 0x47
    && head[4] === 0x0d
    && head[5] === 0x0a
    && head[6] === 0x1a
    && head[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    head.length >= 12
    && asciiAt(head, 0, 'RIFF')
    && asciiAt(head, 8, 'WEBP')
  ) {
    return 'image/webp'
  }
  return null
}

/**
 * 读取文件头做魔数校验，并与扩展名/MIME 结论交叉验证。
 * 改后缀、伪造 Content-Type 的非图片文件会在这里被前端直接拒绝（不发 presign）。
 */
export async function verifyCoverMagic(file: File): Promise<CoverMimeType> {
  const head = new Uint8Array(
    await file.slice(0, COVER_MAGIC_PROBE_BYTES).arrayBuffer(),
  )
  const detected = detectCoverMimeFromMagic(head)
  if (!detected) {
    throw new CoverImageValidationError('unsupportedType')
  }
  return detected
}

/** 解码/编码环境失败（如无 canvas、webp/jpeg 均不可用），区别于格式校验失败。 */
export class CoverProcessError extends Error {
  constructor() {
    super('cover image preprocessing failed')
    this.name = 'CoverProcessError'
  }
}

const encodeAttemptsDefault = 5
/** 首轮编码质量；仍超限时按轮次缩边/降质。 */
const encodeQualityStart = 0.86
const encodeScaleStep = 0.8
const encodeQualityStep = 0.92

function encodeCanvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

/**
 * 校验 + 16:9 居中裁切 + 重编码，返回大小不超上限、可直接直传的 File。
 * 编码优先 webp（体积/透明度兼得），环境不支持时回退 jpeg；
 * 超出 2MB 时按轮次缩边/降质，直到满足或用尽轮次。
 */
export async function preprocessCoverFile(file: File): Promise<File> {
  const check = checkCoverFile(file)
  if (!check.ok) {
    throw new CoverImageValidationError(check.issue)
  }

  // 扩展名/MIME 只是声明，真正的内容格式以文件头魔数为准；不一致直接拒绝。
  const detected = await verifyCoverMagic(file)
  if (detected !== check.mime) {
    throw new CoverImageValidationError('unsupportedType')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const crop = computeCoverCrop(bitmap.width, bitmap.height)
    const baseScale = Math.min(
      1,
      MAX_COVER_OUTPUT_EDGE / Math.max(crop.sw, crop.sh),
    )

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new CoverProcessError()
    }

    let blob: Blob | null = null
    let blobType: CoverMimeType = 'image/webp'
    let scale = baseScale
    let quality = encodeQualityStart

    for (let attempt = 0; attempt < encodeAttemptsDefault; attempt += 1) {
      canvas.width = Math.max(1, Math.round(crop.sw * scale))
      canvas.height = Math.max(1, Math.round(crop.sh * scale))
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(
        bitmap,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      blob = await encodeCanvasBlob(canvas, 'image/webp', quality)
      if (blob && blob.type === 'image/webp') {
        blobType = 'image/webp'
      } else {
        // 环境不支持 webp 编码（blob 为 null 或回退成 png）：改用全兼容的 jpeg（不保透明）。
        blob = await encodeCanvasBlob(canvas, 'image/jpeg', quality)
        blobType = 'image/jpeg'
      }

      if (blob && blob.size <= MAX_COVER_BYTES) {
        break
      }
      scale *= encodeScaleStep
      quality *= encodeQualityStep
    }

    if (!blob) {
      throw new CoverProcessError()
    }

    const extension = blobType === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `cover.${extension}`, { type: blobType })
  } finally {
    bitmap.close()
  }
}
