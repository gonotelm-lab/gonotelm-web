/**
 * 头像图片的客户端校验与裁剪编码。
 *
 * 这里的限制与后端 `identityentity` / `pkgimage.Validate` 保持一致：
 * - 格式：PNG / JPEG，按**魔数**判断而非浏览器声明的 MIME（后端同样以魔数为准）
 * - 大小：≤ 1MB
 *
 * 尺寸不设上限：裁剪会把结果重新编码成 256×256，原始尺寸多大都不影响最终产物。
 * 前端校验只是为了尽早给出反馈，后端仍是最终裁决者。
 */

/** 与后端 `entity.MaxAvatarBytes` 一致。 */
export const AVATAR_MAX_BYTES = 1024 * 1024

/** 裁剪后输出的正方形边长。 */
export const AVATAR_CROP_SIZE = 256

/** 裁剪结果的编码格式与质量（后端只接受 png/jpeg）。 */
export const AVATAR_OUTPUT_MIME = 'image/jpeg'
const AVATAR_OUTPUT_QUALITY = 0.92

export const AVATAR_ACCEPT = 'image/png,image/jpeg'

export type AvatarImageErrorCode =
  | 'unsupported-format'
  | 'empty'
  | 'too-large'
  | 'decode-failed'

export interface AvatarImageError {
  code: AvatarImageErrorCode
  /** 该错误相关的数值（超限的大小），便于调用方拼装 i18n 文案。 */
  maxBytes?: number
}

export interface AvatarImageInfo {
  width: number
  height: number
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

const readMagic = async (file: Blob, length: number): Promise<Uint8Array> => {
  const buffer = await file.slice(0, length).arrayBuffer()
  return new Uint8Array(buffer)
}

const startsWith = (bytes: Uint8Array, magic: readonly number[]) =>
  bytes.length >= magic.length && magic.every((byte, index) => bytes[index] === byte)

/**
 * 按魔数判断图片类型；不依赖 `file.type`，因为浏览器有时会给出空值或错误值。
 */
export async function sniffAvatarFormat(file: Blob): Promise<'png' | 'jpeg' | null> {
  const bytes = await readMagic(file, 8)
  if (startsWith(bytes, PNG_MAGIC)) return 'png'
  if (startsWith(bytes, JPEG_MAGIC)) return 'jpeg'
  return null
}

/**
 * 校验用户选择的原始文件：非空 → 大小 → 格式 → 能否解码。
 * 便宜的检查先行；格式按魔数判定，因此空文件/截断文件会报格式或解码错误。
 * 尺寸不限，因此不需要在这里读出宽高。
 */
export async function validateAvatarFile(file: File): Promise<AvatarImageError | null> {
  if (file.size <= 0) {
    return { code: 'empty' }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { code: 'too-large', maxBytes: AVATAR_MAX_BYTES }
  }
  if (!(await sniffAvatarFormat(file))) {
    return { code: 'unsupported-format' }
  }

  try {
    await readImageInfo(file)
  } catch {
    // 魔数正确但数据损坏（例如被截断的文件）。
    return { code: 'decode-failed' }
  }

  return null
}

/**
 * 创建用于解码的图片元素；抽成可替换的接缝，便于在无 DOM 的测试环境注入替身。
 * 浏览器里 `document` 必然存在，Node 环境才会走 `Image` 兜底。
 */
export type AvatarImageFactory = () => HTMLImageElement

const defaultImageFactory: AvatarImageFactory = () =>
  typeof document === 'undefined' ? new Image() : document.createElement('img')

/**
 * 解码 object URL，返回可直接交给画布的图片元素。
 * 校验与裁剪共用这一条解码路径，因此测试只需注入 `createImage` 即可提供尺寸，
 * 不必依赖真实 DOM 的 `<img>` 加载事件。
 */
export const loadAvatarImage = (
  url: string,
  createImage: AvatarImageFactory = defaultImageFactory,
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = createImage()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image decode failed'))
    image.src = url
  })

const readImageInfo = async (file: Blob): Promise<AvatarImageInfo> => {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadAvatarImage(url)
    return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 把已解码的图片渲染成 object URL，供裁剪器使用；调用方负责 revoke。 */
export const createObjectUrl = (file: Blob): string => URL.createObjectURL(file)

export interface AvatarCropArea {
  /** 源图上裁剪框左上角坐标（源图像素）。 */
  x: number
  y: number
  /** 裁剪框边长（源图像素，正方形）。 */
  size: number
}

/**
 * 计算源图居中的最大内接正方形，作为裁剪框的初始落位。
 */
export function centeredCropArea(width: number, height: number): AvatarCropArea {
  const size = Math.max(1, Math.min(width, height))
  return {
    x: Math.max(0, Math.round((width - size) / 2)),
    y: Math.max(0, Math.round((height - size) / 2)),
    size,
  }
}

/** 创建用于裁剪编码的画布；抽成可替换的接缝，便于在无 DOM 的测试环境注入。 */
export type AvatarCanvasFactory = (size: number) => HTMLCanvasElement

const defaultCanvasFactory: AvatarCanvasFactory = (size) => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

/**
 * 把源图上的一块正方形区域绘制到 target×target 画布并编码为 JPEG blob。
 * 输出尺寸固定为 `AVATAR_CROP_SIZE`，因此结果必然满足后端的尺寸限制。
 *
 * 画布尺寸由本函数设置，工厂只需返回元素（或测试替身）。
 */
export async function cropImageToBlob(
  image: CanvasImageSource,
  area: AvatarCropArea,
  options: { target?: number; createCanvas?: AvatarCanvasFactory } = {},
): Promise<Blob> {
  const target = options.target ?? AVATAR_CROP_SIZE
  const canvas = (options.createCanvas ?? defaultCanvasFactory)(target)
  canvas.width = target
  canvas.height = target

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('canvas 2d context unavailable')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  // 头像统一铺白底，避免带透明通道的 PNG 转 JPEG 后边缘发黑。
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, target, target)
  context.drawImage(image, area.x, area.y, area.size, area.size, 0, 0, target, target)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, AVATAR_OUTPUT_MIME, AVATAR_OUTPUT_QUALITY)
  })

  if (!blob) {
    throw new Error('canvas encode failed')
  }
  return blob
}
