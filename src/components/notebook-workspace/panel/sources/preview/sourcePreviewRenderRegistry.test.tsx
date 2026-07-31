import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceHighlightRange } from './sourcePreviewMarkdown'
import { renderSourcePreviewContent } from './sourcePreviewRenderRegistry'

const markdownRendererSpy = vi.hoisted(() => vi.fn())

vi.mock('../../../shared/markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: (props: { content: string }) => markdownRendererSpy(props),
}))

vi.mock('../components/SourceParsedTreeView', () => ({
  SourceParsedTreeView: () => <div data-testid="tree-view" />,
}))

const renderContent = (overrides?: Partial<{
  markdown: string
  focusRange: SourceHighlightRange | null
}>) => renderToStaticMarkup(
  <div>
    {renderSourcePreviewContent({
      viewType: 'content',
      markdown: overrides?.markdown ?? 'alpha\nbeta\ngamma',
      focusRange: overrides?.focusRange ?? null,
    })}
  </div>,
)

describe('renderSourcePreviewContent', () => {
  beforeEach(() => {
    markdownRendererSpy.mockReset()
    markdownRendererSpy.mockImplementation(({ content }: { content: string }) => (
      <div data-testid="markdown-renderer">{content}</div>
    ))
  })

  it('does not inject top citation highlight block when focus range is missing', () => {
    const html = renderContent()

    expect(html).not.toContain('data-citation-range-highlight="true"')
  })

  it('renders marked markdown when focus range exists', () => {
    markdownRendererSpy.mockReturnValue(<div data-testid="markdown-renderer" />)
    const focusRange: SourceHighlightRange = { start: 6, end: 10 }
    renderContent({
      focusRange,
    })

    const markdownProps = markdownRendererSpy.mock.calls.at(-1)?.[0] as { content?: string } | undefined
    expect(markdownProps?.content).toContain('<mark>beta</mark>')
  })
})
