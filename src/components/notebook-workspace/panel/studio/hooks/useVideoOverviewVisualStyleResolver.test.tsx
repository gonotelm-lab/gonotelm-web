import { act, create } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { mockServer, setMockScenario } from '@/test/mocks'
import type { GenerateVideoOverviewParameters } from '@/types/api'
import { useVideoOverviewVisualStyleResolver } from './useVideoOverviewVisualStyleResolver'

const stylePreviewsUrl = 'http://127.0.0.1:4173/api/v1/artifacts/style-previews'

type Resolver = (
  params: GenerateVideoOverviewParameters,
) => Promise<GenerateVideoOverviewParameters>

const params: GenerateVideoOverviewParameters = {
  language: 'zh-CN',
  visual_style: 'default',
  tip: '',
}

const renderResolver = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resolved: { current?: Resolver } = {}
  const Probe = () => {
    resolved.current = useVideoOverviewVisualStyleResolver()
    return null
  }
  await act(async () => {
    create(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    )
  })
  if (!resolved.current) {
    throw new Error('resolver was not created')
  }
  return { resolve: resolved.current }
}

describe('useVideoOverviewVisualStyleResolver', () => {
  it('confirms the supported styles for kind=video_overview on submit', async () => {
    const requests = vi.fn()
    mockServer.use(
      http.get(stylePreviewsUrl, ({ request }) => {
        requests(new URL(request.url).searchParams.get('kind'))
        return HttpResponse.json({
          code: 0,
          msg: 'ok',
          data: {
            kind: 'video_overview',
            default_visual_style: 'cute',
            previews: [
              { visual_style: 'cute', preview_url: '' },
              { visual_style: 'default', preview_url: '' },
            ],
          },
        })
      }),
    )

    const { resolve } = await renderResolver()
    const result = await resolve({ ...params, visual_style: 'legacy-style' })

    expect(requests).toHaveBeenCalledWith('video_overview')
    expect(result.visual_style).toBe('cute')
  })

  it('keeps a supported style', async () => {
    const { resolve } = await renderResolver()

    const result = await resolve({ ...params, visual_style: 'educational' })

    expect(result.visual_style).toBe('educational')
  })

  it('falls back to the hardcoded styles when the endpoint errors', async () => {
    setMockScenario('studio', 'server-error')
    const { resolve } = await renderResolver()

    const result = await resolve({ ...params, visual_style: 'cute' })

    expect(result).toEqual({ ...params, visual_style: 'cute' })
  })
})
