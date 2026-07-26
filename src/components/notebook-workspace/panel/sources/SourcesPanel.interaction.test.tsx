import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SourcesPanel } from './SourcesPanel'
import type { SourceListItem } from './types/sourceTypes'

const overlaySpy = vi.hoisted(() => vi.fn())

vi.mock('@/api/source', () => ({
  buildSourceParsedContentQueryOptions: (sourceId: string) => ({
    queryKey: ['source-parsed-content-test', sourceId],
    queryFn: async () => ({
      content: '# Source Title\n\nSource preview body.',
      url: '',
    }),
    staleTime: 0,
    gcTime: 0,
  }),
  buildSourceParsedContentUrlQueryOptions: (url: string) => ({
    queryKey: ['source-parsed-content-url-test', url],
    queryFn: async () => 'fallback content',
    staleTime: 0,
    gcTime: 0,
  }),
}))

vi.mock('./components/AddSourceDialog', () => ({
  AddSourceDialog: () => null,
}))

vi.mock('./components/SourceListRow', () => ({
  SourceListRow: ({
    item,
    onPreviewItem,
  }: {
    item: SourceListItem
    onPreviewItem: (nextItem: SourceListItem) => void
  }) => (
    <div>
      <button
        data-testid={`preview-${item.id}`}
        onClick={() => onPreviewItem(item)}
      >
        preview
      </button>
    </div>
  ),
}))

vi.mock('./components/SourceInlinePreview', () => ({
  SourceInlinePreview: ({
    viewType,
    onOpenOverlay,
  }: {
    viewType: 'content'
    onOpenOverlay: () => void
  }) => (
    <div>
      <span data-testid="inline-view">{viewType}</span>
      <button aria-label="放大预览" onClick={onOpenOverlay}>
        expand
      </button>
    </div>
  ),
}))

vi.mock('../../shared/ui/PanelSubpageLayout', () => ({
  PanelSubpageLayout: ({
    primaryContent,
    subpage,
  }: {
    primaryContent: ReactNode
    subpage: null | { title: string; content: ReactNode; onClose: () => void }
  }) => (
    <div>
      {primaryContent}
      {subpage ? (
        <section data-testid="subpage">
          <h2 data-testid="subpage-title">{subpage.title}</h2>
          <button data-testid="subpage-close" onClick={subpage.onClose}>
            close
          </button>
          {subpage.content}
        </section>
      ) : null}
    </div>
  ),
}))

vi.mock('./components/SourcePreviewOverlay', () => ({
  SourcePreviewOverlay: (props: object) => {
    overlaySpy(props)
    return null
  },
}))

const sourceItem: SourceListItem = {
  id: 'source-1',
  kind: 'text',
  title: 'source title',
  name: '来源一',
  iconType: 'text',
  status: 'ready',
}

const createPanelProps = () => ({
  collapsed: false,
  isBusy: false,
  isHydrating: false,
  loadingSkeletonCount: 0,
  sourceListItems: [sourceItem],
  removingMap: {},
  allSourcesChecked: false,
  someSourcesChecked: false,
  onCollapse: () => undefined,
  onCreateFile: async () => undefined,
  onCreateUrl: async () => undefined,
  onCreateText: async () => undefined,
  onToggleAll: () => undefined,
  onToggleItem: () => undefined,
  onDeleteItem: async () => undefined,
  onRetryItem: async () => undefined,
  onRenameItem: async () => undefined,
  checkedMap: {},
  previewRequest: null,
})

const renderSourcesPanel = async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  let renderer = null as unknown as ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <SourcesPanel {...createPanelProps()} />
      </QueryClientProvider>,
    )
  })
  return renderer
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('SourcesPanel interaction', () => {
  beforeEach(() => {
    overlaySpy.mockReset()
  })

  it('点击来源预览后打开内联子页', async () => {
    const renderer = await renderSourcesPanel()

    const previewButton = renderer.root.findByProps({
      'data-testid': 'preview-source-1',
    })
    await act(async () => {
      previewButton.props.onClick()
      await flushMicrotasks()
    })

    const subpageTitle = renderer.root.findByProps({
      'data-testid': 'subpage-title',
    })
    expect(subpageTitle.children.join('')).toBe('预览')
  })

  it('内联预览点击放大后打开 overlay', async () => {
    const renderer = await renderSourcesPanel()

    const previewButton = renderer.root.findByProps({
      'data-testid': 'preview-source-1',
    })
    await act(async () => {
      previewButton.props.onClick()
      await flushMicrotasks()
    })

    const expandButton = renderer.root.findByProps({ 'aria-label': '放大预览' })
    await act(async () => {
      expandButton.props.onClick()
      await flushMicrotasks()
    })

    const latestOverlayProps = overlaySpy.mock.calls.at(-1)?.[0] as { open?: boolean } | undefined
    expect(latestOverlayProps?.open).toBe(true)
  })
})
