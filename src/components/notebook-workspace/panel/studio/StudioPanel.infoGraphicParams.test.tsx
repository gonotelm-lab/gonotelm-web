import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerateAudioOverviewParameters, GenerateInfoGraphicParameters } from '@/types/api'
import { StudioPanel } from './StudioPanel'

vi.mock('react-syntax-highlighter', () => ({
  Prism: () => null,
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneLight: {},
}))

const submitArtifactTaskMock = vi.hoisted(() => vi.fn(async () => undefined))
const reloadHistoryArtifactsMock = vi.hoisted(() => vi.fn(async () => undefined))
const confirmedInfoGraphicParams = vi.hoisted(
  () =>
    ({
      orientation: 'landscape',
      text_language: 'en(English)',
      detail_level: 'detailed',
      extra_prompt: '突出 3 个关键结论',
    }) satisfies GenerateInfoGraphicParameters,
)
const confirmedAudioOverviewParams = vi.hoisted(
  () =>
    ({
      language: 'en(English)',
      style: 'discussion',
      tip: '突出关键冲突点',
    }) satisfies GenerateAudioOverviewParameters,
)

vi.mock('./hooks/useStudioArtifactTasks', () => ({
  useStudioArtifactTasks: () => ({
    artifactItems: [],
    historyLoading: false,
    historyError: '',
    actionErrorToast: null,
    clearActionErrorToast: vi.fn(),
    pendingActions: {},
    reloadHistoryArtifacts: reloadHistoryArtifactsMock,
    submitArtifactTask: submitArtifactTaskMock,
    retryArtifact: vi.fn(async () => undefined),
    cancelArtifact: vi.fn(async () => undefined),
    deleteArtifact: vi.fn(async () => undefined),
    isArtifactActionPending: () => false,
  }),
}))

vi.mock('./preview/useStudioPreviewController', () => ({
  useStudioPreviewController: () => ({
    previewState: {
      inlineOpen: false,
      overlayOpen: false,
      targetId: '',
      loading: false,
      content: '',
      contentUrl: '',
      error: '',
    },
    previewTarget: null,
    previewCapability: null,
    openPreviewByItemClick: () => undefined,
    openOverlayFromInline: () => undefined,
    closeInlinePreview: () => undefined,
    closeOverlayPreview: () => undefined,
    retryPreviewLoad: () => undefined,
    downloadPreviewContent: () => undefined,
  }),
}))

vi.mock('./components/StudioToolCard', () => ({
  StudioToolCard: ({
    tool,
    onClick,
    onAdvancedClick,
  }: {
    tool: { actionId?: string }
    onClick?: () => void
    onAdvancedClick?: () => void
  }) => (
    <div>
      {tool.actionId ? (
        <button
          data-testid={`tool-${tool.actionId}`}
          onClick={onClick}
        >
          run
        </button>
      ) : null}
      {tool.actionId && onAdvancedClick ? (
        <button
          data-testid={`advanced-${tool.actionId}`}
          onClick={onAdvancedClick}
        >
          advanced
        </button>
      ) : null}
    </div>
  ),
}))

vi.mock('./InfoGraphicSettingsDialog', () => ({
  InfoGraphicSettingsDialog: ({
    open,
    onGenerate,
  }: {
    open: boolean
    onGenerate: (params: GenerateInfoGraphicParameters) => void
  }) =>
    open ? (
      <button
        data-testid="dialog-generate-info-graphic"
        onClick={() => onGenerate(confirmedInfoGraphicParams)}
      >
        generate
      </button>
    ) : null,
}))

vi.mock('./AudioOverviewSettingsDialog', () => ({
  AudioOverviewSettingsDialog: ({
    open,
    onGenerate,
  }: {
    open: boolean
    onGenerate: (params: GenerateAudioOverviewParameters) => void
  }) =>
    open ? (
      <button
        data-testid="dialog-generate-audio-overview"
        onClick={() => onGenerate(confirmedAudioOverviewParams)}
      >
        generate-audio
      </button>
    ) : null,
}))

vi.mock('../../shared/ui/PanelSubpageLayout', () => ({
  PanelSubpageLayout: ({
    primaryContent,
    subpage,
  }: {
    primaryContent: ReactNode
    subpage: null | { content: ReactNode }
  }) => (
    <div>
      {primaryContent}
      {subpage ? subpage.content : null}
    </div>
  ),
}))

vi.mock('./components/StudioArtifactPreviewOverlay', () => ({
  StudioArtifactPreviewOverlay: () => null,
}))

vi.mock('./components/StudioArtifactInlinePreview', () => ({
  StudioArtifactInlinePreview: () => null,
}))

const renderStudioPanel = () => {
  let renderer = null as unknown as ReactTestRenderer
  act(() => {
    renderer = create(
      <StudioPanel
        notebookId="notebook-1"
        selectedSourceIds={['source-1']}
        readySourceIds={['source-1']}
        onCollapse={() => undefined}
      />,
    )
  })
  return renderer
}

describe('StudioPanel 任务触发参数', () => {
  beforeEach(() => {
    submitArtifactTaskMock.mockClear()
    reloadHistoryArtifactsMock.mockClear()
  })

  it('触发音频概览任务时携带默认参数', () => {
    const renderer = renderStudioPanel()

    const quickCreateButton = renderer.root.findByProps({
      'data-testid': 'tool-generate-audio_overview',
    })
    act(() => {
      quickCreateButton.props.onClick()
    })

    expect(submitArtifactTaskMock).toHaveBeenCalledTimes(1)
    expect(submitArtifactTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'audio_overview',
        actionId: 'generate-audio_overview',
        audioOverview: expect.objectContaining({
          language: 'zh-CN',
          style: 'abstract',
        }),
      }),
    )
  })

  it('音频高级设置确认后，直接点击也复用上一次参数', () => {
    const renderer = renderStudioPanel()

    const advancedEntry = renderer.root.findByProps({
      'data-testid': 'advanced-generate-audio_overview',
    })
    act(() => {
      advancedEntry.props.onClick()
    })

    const dialogGenerateButton = renderer.root.findByProps({
      'data-testid': 'dialog-generate-audio-overview',
    })
    act(() => {
      dialogGenerateButton.props.onClick()
    })

    const quickCreateButton = renderer.root.findByProps({
      'data-testid': 'tool-generate-audio_overview',
    })
    act(() => {
      quickCreateButton.props.onClick()
    })

    expect(submitArtifactTaskMock).toHaveBeenCalledTimes(2)
    expect(submitArtifactTaskMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: 'audio_overview',
        actionId: 'generate-audio_overview',
        audioOverview: confirmedAudioOverviewParams,
      }),
    )
    expect(submitArtifactTaskMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        kind: 'audio_overview',
        actionId: 'generate-audio_overview',
        audioOverview: confirmedAudioOverviewParams,
      }),
    )
  })

  it('高级设置确认后，直接点击也复用上一次参数', () => {
    const renderer = renderStudioPanel()

    const advancedEntry = renderer.root.findByProps({
      'data-testid': 'advanced-generate-info_graphic',
    })
    act(() => {
      advancedEntry.props.onClick()
    })

    const dialogGenerateButton = renderer.root.findByProps({
      'data-testid': 'dialog-generate-info-graphic',
    })
    act(() => {
      dialogGenerateButton.props.onClick()
    })

    const quickCreateButton = renderer.root.findByProps({
      'data-testid': 'tool-generate-info_graphic',
    })
    act(() => {
      quickCreateButton.props.onClick()
    })

    expect(submitArtifactTaskMock).toHaveBeenCalledTimes(2)
    expect(submitArtifactTaskMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: 'info_graphic',
        actionId: 'generate-info_graphic',
        infoGraphic: confirmedInfoGraphicParams,
      }),
    )
    expect(submitArtifactTaskMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        kind: 'info_graphic',
        actionId: 'generate-info_graphic',
        infoGraphic: confirmedInfoGraphicParams,
      }),
    )
  })
})

