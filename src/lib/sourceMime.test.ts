import { describe, expect, it } from 'vitest'
import { resolveUploadMimeType } from './sourceMime'

const makeFileLike = (name: string, type: string) => ({ name, type }) as File

describe('resolveUploadMimeType', () => {
  it('txt 使用带 charset 的 canonical mime', () => {
    const mime = resolveUploadMimeType(makeFileLike('a.txt', 'text/plain'))
    expect(mime).toBe('text/plain; charset=utf-8')
  })

  it('markdown 使用带 charset 的 canonical mime', () => {
    const mime = resolveUploadMimeType(makeFileLike('a.md', 'text/markdown'))
    expect(mime).toBe('text/markdown; charset=utf-8')
  })

  it('即使浏览器返回带参数，也归一化为 canonical mime', () => {
    const mime = resolveUploadMimeType(makeFileLike('a.txt', 'text/plain; charset=gbk'))
    expect(mime).toBe('text/plain; charset=utf-8')
  })

  it('pdf 保持原样', () => {
    const mime = resolveUploadMimeType(makeFileLike('a.pdf', 'application/pdf'))
    expect(mime).toBe('application/pdf')
  })

  it('未知文件类型兜底为原始 mime 或 octet-stream', () => {
    expect(resolveUploadMimeType(makeFileLike('a.unknown', 'application/x-custom'))).toBe(
      'application/x-custom',
    )
    expect(resolveUploadMimeType(makeFileLike('a.unknown', ''))).toBe('application/octet-stream')
  })
})
