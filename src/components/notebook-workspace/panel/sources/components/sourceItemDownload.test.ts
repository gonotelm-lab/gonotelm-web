import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadSourceItemParsedContent } from './sourceItemDownload'

const getSourceParsedContentForDownloadMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/source', () => ({
  getSourceParsedContentForDownload: getSourceParsedContentForDownloadMock,
}))

interface AnchorStub {
  href: string
  download: string
  rel: string
  click: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

describe('downloadSourceItemParsedContent', () => {
  beforeEach(() => {
    getSourceParsedContentForDownloadMock.mockReset()
    getSourceParsedContentForDownloadMock.mockResolvedValue({
      url: 'https://download.example/source-1.md',
    })
  })

  it('先请求 source 详情接口，再使用响应中的 url 触发浏览器下载', async () => {
    const anchor: AnchorStub = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(),
      remove: vi.fn(),
    }
    const createElement = vi.fn(() => anchor as unknown as HTMLAnchorElement)
    const appendChild = vi.fn()

    const doc = {
      createElement,
      body: {
        appendChild,
      },
    } as unknown as Pick<Document, 'createElement' | 'body'>

    await downloadSourceItemParsedContent('source-1', doc)

    expect(getSourceParsedContentForDownloadMock).toHaveBeenCalledWith('source-1')
    expect(createElement).toHaveBeenCalledWith('a')
    expect(anchor.href).toBe('https://download.example/source-1.md')
    expect(anchor.download).toBe('')
    expect(anchor.rel).toBe('noopener noreferrer')
    expect(appendChild).toHaveBeenCalledWith(anchor)
    expect(anchor.click).toHaveBeenCalledTimes(1)
    expect(anchor.remove).toHaveBeenCalledTimes(1)
  })

  it('接口未返回可下载 url 时不触发下载动作', async () => {
    getSourceParsedContentForDownloadMock.mockResolvedValue({})
    const anchor: AnchorStub = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(),
      remove: vi.fn(),
    }
    const createElement = vi.fn(() => anchor as unknown as HTMLAnchorElement)
    const appendChild = vi.fn()
    const doc = {
      createElement,
      body: {
        appendChild,
      },
    } as unknown as Pick<Document, 'createElement' | 'body'>

    await downloadSourceItemParsedContent('source-1', doc)

    expect(createElement).not.toHaveBeenCalled()
    expect(appendChild).not.toHaveBeenCalled()
    expect(anchor.click).not.toHaveBeenCalled()
  })
})
