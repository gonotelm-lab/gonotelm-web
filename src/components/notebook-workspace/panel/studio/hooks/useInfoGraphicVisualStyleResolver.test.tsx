import { act, create } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { mockServer, setMockScenario } from '@/test/mocks'
import type { GenerateInfoGraphicParameters } from '@/types/api'
import { useInfoGraphicVisualStyleResolver } from './useInfoGraphicVisualStyleResolver'

const stylePreviewsUrl = 'http://127.0.0.1:4173/api/v1/artifacts/style-previews'

type Resolver = (
  params: GenerateInfoGraphicParameters,
) => Promise<GenerateInfoGraphicParameters>

const params: GenerateInfoGraphicParameters = {
  orientation: 'landscape',
  text_language: 'zh-CN',
  detail_level: 'standard',
  visual_style: 'default',
  extra_prompt: '',
}

const renderResolver = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resolved: { current?: Resolver } = {}
  const Probe = () => {
    resolved.current = useInfoGraphicVisualStyleResolver()
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

describe('useInfoGraphicVisualStyleResolver', () => {
  it('confirms the supported styles for kind=info_graphic on submit', async () => {
    const requests = vi.fn()
    mockServer.use(
      http.get(stylePreviewsUrl, ({ request }) => {
        requests(new URL(request.url).searchParams.get('kind'))
        return HttpResponse.json({
          code: 0,
          msg: 'ok',
          data: {
            kind: 'info_graphic',
            default_visual_style: 'hand-drawn',
            previews: [
              { visual_style: 'hand-drawn', preview_url: '' },
              { visual_style: 'default', preview_url: '' },
            ],
          },
        })
      }),
    )

    const { resolve } = await renderResolver()
    const result = await resolve({ ...params, visual_style: 'legacy-style' })

    expect(requests).toHaveBeenCalledWith('info_graphic')
    expect(result.visual_style).toBe('hand-drawn')
  })

  it('keeps a supported style', async () => {
    const { resolve } = await renderResolver()

    const result = await resolve({ ...params, visual_style: 'anime' })

    expect(result.visual_style).toBe('anime')
  })

  it('falls back to the hardcoded styles when the endpoint errors', async () => {
    setMockScenario('studio', 'server-error')
    const { resolve } = await renderResolver()

    const result = await resolve({ ...params, visual_style: 'minimal-2.5d' })

    expect(result).toEqual({ ...params, visual_style: 'minimal-2.5d' })
  })
})
