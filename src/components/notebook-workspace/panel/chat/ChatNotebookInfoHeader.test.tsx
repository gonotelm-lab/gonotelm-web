import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChatNotebookInfoHeader } from './ChatNotebookInfoHeader'

describe('ChatNotebookInfoHeader', () => {
  it('renders notebook title, description, source count, and icon slot', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="Apple DMA Notebook"
        notebookDescription="Notebook description for chat context."
        notebookSourceCount={9}
      />,
    )

    expect(html).toContain('Apple DMA Notebook')
    expect(html).toContain('Notebook description for chat context.')
    expect(html).toContain('9 个来源')
    expect(html).toContain('data-testid="chat-notebook-icon-slot"')
  })

  it('uses fallback title and keeps empty description as blank placeholder', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="   "
        notebookDescription=""
        notebookSourceCount={0}
      />,
    )

    expect(html).toContain('Untitled notebook')
    expect(html).not.toContain('No notebook description yet.')
    expect(html).toContain('0 个来源')
  })

  it('renders description skeleton while generating notebook description', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="Loading Notebook"
        notebookDescription=""
        notebookSourceCount={1}
        descriptionLoading
      />,
    )

    expect(html).toContain('data-testid="chat-notebook-description-skeleton"')
    expect(html).toContain('Loading Notebook')
  })

  it('shows author origin icon left of source count for custom description', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="Custom Notebook"
        notebookDescription="作者写的摘要"
        notebookSourceCount={2}
        customizeDescription
      />,
    )

    expect(html).toContain('data-testid="chat-notebook-description-origin-author"')
    expect(html).toContain('摘要由作者指定')
    expect(html).toContain('2 个来源')
  })

  it('shows AI origin icon left of source count for generated description', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="AI Notebook"
        notebookDescription="AI 写的摘要"
        notebookSourceCount={3}
        customizeDescription={false}
      />,
    )

    expect(html).toContain('data-testid="chat-notebook-description-origin-ai"')
    expect(html).toContain('摘要由 AI 生成')
  })

  it('hides origin icon when AI description is still empty', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="Empty Notebook"
        notebookDescription=""
        notebookSourceCount={0}
        customizeDescription={false}
      />,
    )

    expect(html).not.toContain('chat-notebook-description-origin-')
  })
})
