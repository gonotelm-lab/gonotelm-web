import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { mockServer, setMockScenario } from '@/test/mocks'
import type { GenerateVideoOverviewParameters } from '@/types/api'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    // Dialog portals need a document; the node test env has none.
    Dialog: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="video-overview-settings-dialog">{children}</div> : null,
  }
})

import { VideoOverviewSettingsDialog } from './VideoOverviewSettingsDialog'

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const baseParams: GenerateVideoOverviewParameters = {
  language: 'zh-CN',
  visual_style: 'default',
  tip: '',
}

// Matches VITE_API_BASE_URL stubbed in src/test/setup.ts.
const stylePreviewsUrl = 'http://127.0.0.1:4173/api/v1/artifacts/style-previews'
const styleSectionLabel = i18n.t('studio:settings.visualStyle')

const renderDialog = async (
  initialParams: GenerateVideoOverviewParameters = baseParams,
  open = true,
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onGenerate = vi.fn()
  const onClose = vi.fn()
  const element = (isOpen: boolean) => (
    <QueryClientProvider client={queryClient}>
      <VideoOverviewSettingsDialog
        open={isOpen}
        initialParams={initialParams}
        onClose={onClose}
        onGenerate={onGenerate}
      />
    </QueryClientProvider>
  )
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(element(open))
  })
  await flush()
  const setOpen = async (isOpen: boolean) => {
    await act(async () => {
      renderer.update(element(isOpen))
    })
    await flush()
  }
  return { renderer, onGenerate, onClose, setOpen }
}

const styleGroup = (renderer: ReactTestRenderer) => {
  const group = renderer.root
    .findAllByType(ToggleButtonGroup)
    .find((candidate) => candidate.props['aria-label'] === styleSectionLabel)
  if (!group) {
    throw new Error('visual style group not found')
  }
  return group
}

const styleButtonValues = (renderer: ReactTestRenderer) =>
  styleGroup(renderer)
    .findAllByType(ToggleButton)
    .map((button) => button.props.value)

const clickStyle = async (renderer: ReactTestRenderer, value: string) => {
  const target = styleGroup(renderer)
    .findAllByType('button')
    .find((button) => button.props.value === value)
  if (!target) {
    throw new Error(`style button not found: ${value}`)
  }
  await act(async () => {
    target.props.onClick({ defaultPrevented: false })
  })
}

const clickGenerate = async (renderer: ReactTestRenderer) => {
  const generate = renderer.root
    .findAllByType(Button)
    .find((button) => button.props.children === i18n.t('common:action.generate'))
  if (!generate) {
    throw new Error('generate button not found')
  }
  await act(async () => {
    generate.props.onClick()
  })
}

describe('VideoOverviewSettingsDialog style previews', () => {
  it('requests the endpoint only once the dialog is opened', async () => {
    const requests = vi.fn()
    mockServer.use(
      http.get(stylePreviewsUrl, () => {
        requests()
        return HttpResponse.json({
          code: 0,
          msg: 'ok',
          data: { kind: 'video_overview', default_visual_style: 'default', previews: [] },
        })
      }),
    )

    const { setOpen } = await renderDialog(baseParams, false)
    expect(requests).not.toHaveBeenCalled()

    await setOpen(true)
    expect(requests).toHaveBeenCalledTimes(1)
  })

  it('lists backend styles in backend order with their preview images', async () => {
    const { renderer } = await renderDialog()

    expect(styleButtonValues(renderer)).toEqual(['default', 'cute', 'educational'])
    expect(renderer.root.findAllByType('img').map((image) => image.props.src)).toEqual([
      'https://example.com/video-default.webp',
      'https://example.com/video-cute.webp',
      'https://example.com/video-educational.webp',
    ])
  })

  it('falls back to the hardcoded pills when the endpoint errors', async () => {
    setMockScenario('studio', 'server-error')
    const { renderer } = await renderDialog()

    expect(renderer.root.findAllByType('img')).toHaveLength(0)
    expect(styleButtonValues(renderer)).toEqual(['default', 'educational', 'cute'])
  })

  it('falls back to the hardcoded pills when the endpoint returns no styles', async () => {
    setMockScenario('studio', 'empty')
    const { renderer } = await renderDialog()

    expect(renderer.root.findAllByType('img')).toHaveLength(0)
    expect(styleButtonValues(renderer)).toEqual(['default', 'educational', 'cute'])
  })

  it('generates with the style the user picked from the backend list', async () => {
    const { renderer, onGenerate } = await renderDialog({
      ...baseParams,
      visual_style: 'default',
      tip: '突出结论',
    })

    await clickStyle(renderer, 'cute')
    await clickGenerate(renderer)

    expect(onGenerate).toHaveBeenCalledWith({
      language: 'zh-CN',
      visual_style: 'cute',
      tip: '突出结论',
    })
  })

  it('replaces a stale style with the backend default before generating', async () => {
    const { renderer, onGenerate } = await renderDialog({
      ...baseParams,
      visual_style: 'legacy-style',
    })

    await clickGenerate(renderer)

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ visual_style: 'default' }),
    )
  })
})
