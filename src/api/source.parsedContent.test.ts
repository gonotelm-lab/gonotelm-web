import { describe, expect, it, vi } from 'vitest'
import { getSourceParsedContentForDownload } from './source'

describe('getSourceParsedContentForDownload', () => {
  it('请求 source 详情 download=true 并返回 data（无 /? 拼接）', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        code: 0,
        msg: 'ok',
        data: {
          id: 'source id',
          kind: 'text',
          status: 'ready',
          title: 'source title',
          parsed_content: {
            url: 'https://download.example/source.md',
          },
        },
      }),
    } as Response)

    const data = await getSourceParsedContentForDownload('source id/')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [requestUrl] = fetchSpy.mock.calls[0] as [string]
    expect(requestUrl).toContain('/api/v1/source/source%20id')
    expect(requestUrl).not.toContain('/api/v1/source/source%20id/?')
    expect(requestUrl).not.toContain('/parsed/content')
    expect(requestUrl).toContain('download=true')
    expect(data).toEqual({
      url: 'https://download.example/source.md',
    })
  })
})
