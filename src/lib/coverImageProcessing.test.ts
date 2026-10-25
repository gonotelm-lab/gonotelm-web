import { describe, expect, it } from 'vitest'
import {
  MAX_COVER_BYTES,
  checkCoverFile,
  computeCoverCrop,
  detectCoverMimeFromMagic,
  preprocessCoverFile,
  verifyCoverMagic,
} from './coverImageProcessing'

const makeFile = (props: {
  name: string
  type?: string
  size?: number
}): File => {
  const { name, type = '', size = 1024 } = props
  const blob = new Blob([new Uint8Array(size)], { type })
  const file = new File([blob], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('checkCoverFile', () => {
  it('jpg/png/webp 且不超过 2MB：放行并给出 mime', () => {
    expect(checkCoverFile(makeFile({ name: 'cover.jpg', type: 'image/jpeg' }))).toEqual({
      ok: true,
      mime: 'image/jpeg',
    })
    expect(checkCoverFile(makeFile({ name: 'cover.png', type: 'image/png' }))).toEqual({
      ok: true,
      mime: 'image/png',
    })
    expect(checkCoverFile(makeFile({ name: 'cover.webp', type: 'image/webp' }))).toEqual({
      ok: true,
      mime: 'image/webp',
    })
  })

  it('file.type 缺失时按扩展名兜底放行', () => {
    expect(checkCoverFile(makeFile({ name: 'cover.jpg' }))).toEqual({
      ok: true,
      mime: 'image/jpeg',
    })
  })

  it.each([
    ['cover.gif', 'image/gif'],
    ['cover.bmp', 'image/bmp'],
    ['cover.heic', 'image/heic'],
    ['cover', ''],
  ])('非白名单格式（%s）直接拒绝', (name, type) => {
    expect(checkCoverFile(makeFile({ name, type }))).toEqual({
      ok: false,
      issue: 'unsupportedType',
    })
  })

  it('扩展名与 MIME 不一致（改后缀上传）拒绝', () => {
    expect(
      checkCoverFile(makeFile({ name: 'cover.jpg', type: 'image/png' })),
    ).toEqual({ ok: false, issue: 'unsupportedType' })
  })

  it('超过 2MB 拒绝为 oversized；空文件同样拒绝', () => {
    expect(
      checkCoverFile(makeFile({ name: 'cover.png', type: 'image/png', size: MAX_COVER_BYTES + 1 })),
    ).toEqual({ ok: false, issue: 'oversized' })
    expect(
      checkCoverFile(makeFile({ name: 'cover.png', type: 'image/png', size: 0 })),
    ).toEqual({ ok: false, issue: 'oversized' })
  })

  it('恰好 2MB 放行', () => {
    expect(
      checkCoverFile(makeFile({ name: 'cover.png', type: 'image/png', size: MAX_COVER_BYTES })),
    ).toEqual({ ok: true, mime: 'image/png' })
  })
})

describe('detectCoverMimeFromMagic', () => {
  const bytes = (...values: number[]) => new Uint8Array(values)
  const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0))

  it('识别 jpeg / png / webp 的文件头签名', () => {
    expect(detectCoverMimeFromMagic(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(
      detectCoverMimeFromMagic(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)),
    ).toBe('image/png')

    const webp = new Uint8Array(12)
    webp.set(ascii('RIFF'), 0)
    webp.set(ascii('WEBP'), 8)
    expect(detectCoverMimeFromMagic(webp)).toBe('image/webp')
  })

  it('非白名单格式或截断文件头返回 null', () => {
    expect(detectCoverMimeFromMagic(ascii('GIF89a......'))).toBeNull()
    expect(detectCoverMimeFromMagic(bytes(0x89, 0x50))).toBeNull()
    expect(detectCoverMimeFromMagic(bytes())).toBeNull()
  })
})

describe('verifyCoverMagic / preprocessCoverFile', () => {
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])

  it('魔数识别结果返回给调用方', async () => {
    const file = new File([pngHeader], 'cover.png', { type: 'image/png' })
    await expect(verifyCoverMagic(file)).resolves.toBe('image/png')
  })

  it('改后缀的非图片（GIF 伪装 PNG）在解码前就被拒绝', async () => {
    const fake = new File(
      [Uint8Array.from('GIF89a......', (char) => char.charCodeAt(0))],
      'cover.png',
      { type: 'image/png' },
    )
    await expect(preprocessCoverFile(fake)).rejects.toMatchObject({
      name: 'CoverImageValidationError',
      issue: 'unsupportedType',
    })
  })

  it('文件头真实格式与扩展名/MIME 不一致时拒绝', async () => {
    // 真 JPEG 内容改名 .png：元数据校验会放行，魔数交叉校验必须拦下。
    const spoofed = new File([jpegHeader], 'cover.png', { type: 'image/png' })
    await expect(preprocessCoverFile(spoofed)).rejects.toMatchObject({
      name: 'CoverImageValidationError',
      issue: 'unsupportedType',
    })
  })
})

describe('computeCoverCrop', () => {
  it('已是 16:9：原样返回居中窗口', () => {
    expect(computeCoverCrop(1920, 1080)).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080 })
    expect(computeCoverCrop(1600, 900)).toEqual({ sx: 0, sy: 0, sw: 1600, sh: 900 })
  })

  it('宽于 16:9 的图：左右居中裁掉多余宽度', () => {
    const crop = computeCoverCrop(2000, 1000)
    expect(crop.sh).toBe(1000)
    expect(crop.sw).toBe(1778) // round(1000 * 16/9)
    expect(crop.sx).toBe(Math.floor((2000 - 1778) / 2))
    expect(crop.sy).toBe(0)
  })

  it('高于 16:9 的图/方图：上下居中裁掉多余高度', () => {
    const square = computeCoverCrop(1000, 1000)
    expect(square.sw).toBe(1000)
    expect(square.sh).toBe(563) // round(1000 * 9/16)
    expect(square.sy).toBe(Math.floor((1000 - 563) / 2))
    expect(square.sx).toBe(0)

    const tall = computeCoverCrop(800, 1600)
    expect(tall.sw).toBe(800)
    expect(tall.sh).toBe(450)
    expect(tall.sy).toBe(Math.floor((1600 - 450) / 2))
    expect(tall.sx).toBe(0)
  })

  it('奇数尺寸：裁切窗口不越界', () => {
    const crop = computeCoverCrop(101, 303)
    expect(crop.sw + crop.sx).toBeLessThanOrEqual(101)
    expect(crop.sh + crop.sy).toBeLessThanOrEqual(303)
    expect(crop.sw).toBeGreaterThan(0)
    expect(crop.sh).toBeGreaterThan(0)
  })
})
