import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { SourceInlinePreview } from './SourceInlinePreview'

vi.mock('../preview/sourcePreviewRenderRegistry', () => ({
  renderSourcePreviewContent: ({ markdown }: { markdown: string }) => (
    <div data-testid="preview-markdown">{markdown}</div>
  ),
}))

const baseProps = {
  sourceName: 'demo.md',
  viewType: 'content' as const,
  loading: false,
  error: '',
  notice: '',
  markdown: '# Hello\n\nBody',
  focusRange: null,
  canOpenOverlay: true,
  canDownload: true,
  onOpenOverlay: vi.fn(),
  onDownload: vi.fn(),
  onRetryLoad: vi.fn(),
}

describe('SourceInlinePreview resize degradation', () => {
  it('keeps markdown mounted while the panel is resizing', () => {
    let renderer!: ReactTestRenderer

    act(() => {
      renderer = create(
        <SourceInlinePreview {...baseProps} degradedByResizing={false} />,
      )
    })

    expect(renderer.root.findByProps({ 'data-testid': 'preview-markdown' }).props.children).toBe(
      '# Hello\n\nBody',
    )

    act(() => {
      renderer.update(
        <SourceInlinePreview {...baseProps} degradedByResizing />,
      )
    })

    expect(renderer.root.findByProps({ 'data-testid': 'preview-markdown' }).props.children).toBe(
      '# Hello\n\nBody',
    )
  })
})
