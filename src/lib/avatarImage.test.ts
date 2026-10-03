import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  centeredCropArea,
  cropImageToBlob,
  sniffAvatarFormat,
  validateAvatarFile,
} from './avatarImage'

/** 最小 PNG 头（8 字节魔数 + 填充），足以通过魔数嗅探。 */
const pngBytes = (extra = 0) => {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return new Uint8Array([...header, ...new Array(extra).fill(0)])
}

const jpegBytes = (extra = 0) => {
  const header = [0xff, 0xd8, 0xff, 0xe0]
  return new Uint8Array([...header, ...new Array(extra).fill(0)])
}

const fileFrom = (bytes: Uint8Array, name: string, type = '') =>
  new File([bytes as BlobPart], name, { type })

describe('sniffAvatarFormat', () => {
  it('识别 PNG 与 JPEG 魔数', async () => {
    await expect(sniffAvatarFormat(fileFrom(pngBytes(), 'a.png'))).resolves.toBe('png')
    await expect(sniffAvatarFormat(fileFrom(jpegBytes(), 'a.jpg'))).resolves.toBe('jpeg')
  })

  it('忽略浏览器声明的 MIME，以魔数为准', async () => {
    // 声明 image/png 但内容是 JPEG：按内容判定。
    await expect(
      sniffAvatarFormat(fileFrom(jpegBytes(), 'fake.png', 'image/png')),
    ).resolves.toBe('jpeg')
  })

  it('拒绝非图片内容', async () => {
    const text = new TextEncoder().encode('not an image at all')
    await expect(sniffAvatarFormat(fileFrom(text, 'a.txt'))).resolves.toBeNull()
  })

  it('拒绝过短的文件', async () => {
    await expect(sniffAvatarFormat(fileFrom(new Uint8Array([0x89, 0x50]), 'a.png'))).resolves.toBeNull()
  })
})

describe('validateAvatarFile', () => {
  /** 让解码返回指定尺寸；null 表示解码失败。 */
  const stubDecodedSize = (size: { width: number; height: number } | null) => {
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = size?.width ?? 0
      naturalHeight = size?.height ?? 0
      width = size?.width ?? 0
      height = size?.height ?? 0
      set src(_value: string) {
        queueMicrotask(() => {
          if (size) {
            this.onload?.()
          } else {
            this.onerror?.()
          }
        })
      }
    }
    vi.stubGlobal('Image', MockImage)
  }

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    stubDecodedSize({ width: 512, height: 512 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('接受合法的 PNG', async () => {
    await expect(validateAvatarFile(fileFrom(pngBytes(64), 'ok.png'))).resolves.toBeNull()
  })

  it('接受合法的 JPEG', async () => {
    await expect(validateAvatarFile(fileFrom(jpegBytes(64), 'ok.jpg'))).resolves.toBeNull()
  })

  it('拒绝不支持的格式', async () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0])
    await expect(validateAvatarFile(fileFrom(gif, 'a.gif'))).resolves.toEqual({
      code: 'unsupported-format',
    })
  })

  it('拒绝空文件', async () => {
    await expect(validateAvatarFile(fileFrom(new Uint8Array(0), 'empty.png'))).resolves.toEqual({
      code: 'empty',
    })
  })

  it('空文件优先报 empty，而不是格式错误', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    await validateAvatarFile(fileFrom(new Uint8Array(0), 'empty.png'))
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('拒绝超过 1MB 的图片', async () => {
    const tooBig = fileFrom(pngBytes(AVATAR_MAX_BYTES + 1), 'big.png')
    await expect(validateAvatarFile(tooBig)).resolves.toEqual({
      code: 'too-large',
      maxBytes: AVATAR_MAX_BYTES,
    })
  })

  it('边界：恰好 1MB 可以通过大小检查', async () => {
    // 头部已占 8 字节，补足到恰好 1MB。
    const exactly = fileFrom(pngBytes(AVATAR_MAX_BYTES - 8), 'exact.png')
    expect(exactly.size).toBe(AVATAR_MAX_BYTES)
    await expect(validateAvatarFile(exactly)).resolves.toBeNull()
  })

  it('不限制尺寸：超大图片同样通过校验', async () => {
    stubDecodedSize({ width: 6000, height: 4000 })
    await expect(validateAvatarFile(fileFrom(pngBytes(64), 'huge.png'))).resolves.toBeNull()
  })

  it('不限制尺寸：极端长宽比也通过校验', async () => {
    stubDecodedSize({ width: 20000, height: 3 })
    await expect(validateAvatarFile(fileFrom(pngBytes(64), 'panorama.png'))).resolves.toBeNull()
  })

  it('魔数正确但无法解码时返回 decode-failed', async () => {
    stubDecodedSize(null)
    await expect(validateAvatarFile(fileFrom(pngBytes(64), 'broken.png'))).resolves.toEqual({
      code: 'decode-failed',
    })
  })

  it('先检查格式，不为非法格式做解码', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    const text = new TextEncoder().encode('plain text file')
    await validateAvatarFile(fileFrom(text, 'a.txt'))
    expect(createObjectURL).not.toHaveBeenCalled()
  })
})

describe('centeredCropArea', () => {
  it('横图取短边，并水平居中', () => {
    expect(centeredCropArea(1024, 512)).toEqual({ x: 256, y: 0, size: 512 })
  })

  it('竖图取短边，并垂直居中', () => {
    expect(centeredCropArea(512, 1024)).toEqual({ x: 0, y: 256, size: 512 })
  })

  it('正方形铺满', () => {
    expect(centeredCropArea(800, 800)).toEqual({ x: 0, y: 0, size: 800 })
  })

  it('极小尺寸不产生零边长', () => {
    expect(centeredCropArea(1, 1)).toEqual({ x: 0, y: 0, size: 1 })
  })
})

describe('cropImageToBlob', () => {
  const drawImage = vi.fn()
  const fillRect = vi.fn()
  const toBlob = vi.fn((callback: (blob: Blob | null) => void) =>
    callback(new Blob(['cropped'], { type: 'image/jpeg' })),
  )

  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          imageSmoothingEnabled: false,
          imageSmoothingQuality: 'low',
          fillStyle: '',
          fillRect,
          drawImage,
        }),
        toBlob,
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('输出固定 256×256 的 JPEG，并按裁剪区域绘制', async () => {
    const blob = await cropImageToBlob({} as CanvasImageSource, { x: 10, y: 20, size: 100 })
    expect(blob.type).toBe('image/jpeg')
    expect(drawImage).toHaveBeenCalledWith({}, 10, 20, 100, 100, 0, 0, 256, 256)
  })

  it('编码失败时抛错', async () => {
    toBlob.mockImplementationOnce((callback: (blob: Blob | null) => void) => callback(null))
    await expect(
      cropImageToBlob({} as CanvasImageSource, { x: 0, y: 0, size: 50 }),
    ).rejects.toThrow('canvas encode failed')
  })
})
