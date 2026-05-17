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
    expect(html).toContain('9 sources')
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
    expect(html).toContain('0 sources')
  })

  it('renders full description content without truncation fallback replacement', () => {
    const fullDescription = [
      'Line one for full description.',
      'Line two stays visible.',
      'Line three stays visible.',
      'Line four stays visible.',
      'Line five stays visible.',
    ].join(' ')

    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookName="Full Description Notebook"
        notebookDescription={fullDescription}
        notebookSourceCount={2}
      />,
    )

    expect(html).toContain(fullDescription)
  })
})
