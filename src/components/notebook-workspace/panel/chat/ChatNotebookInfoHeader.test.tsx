import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { formatNotebookDate } from '@/lib/formatNotebookDate'
import { getNotebookEmoji } from '@/lib/notebookEmoji'
import { ChatNotebookInfoHeader } from './ChatNotebookInfoHeader'

describe('ChatNotebookInfoHeader', () => {
  it('renders notebook title, description, source count, and emoji fallback', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId="notebook-1"
        notebookName="Apple DMA Notebook"
        notebookDescription="Notebook description for chat context."
        notebookSourceCount={9}
      />,
    )

    expect(html).toContain('Apple DMA Notebook')
    expect(html).toContain('Notebook description for chat context.')
    expect(html).toContain('9 个来源')
    expect(html).toContain('data-testid="chat-notebook-emoji"')
    expect(html).toContain(getNotebookEmoji('notebook-1'))
  })

  it('shows the cover as the title background with owner inside it', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId="notebook-1"
        notebookName="Covered Notebook"
        notebookDescription=""
        notebookSourceCount={1}
        notebookCoverUrl="https://cdn.example.com/covers/notebook-1.webp"
        notebookOwner={{ nickname: 'Alice', avatarUrl: 'https://cdn.example.com/a.png' }}
      />,
    )

    expect(html).toContain('data-testid="chat-notebook-cover"')
    expect(html).toContain('src="https://cdn.example.com/covers/notebook-1.webp"')
    // 标题与 owner 都压在封面里；此时不出现 emoji
    expect(html).toContain('Covered Notebook')
    expect(html).toContain('data-testid="chat-notebook-owner"')
    expect(html).toContain('Alice')
    expect(html).not.toContain('data-testid="chat-notebook-emoji"')
  })

  it('hides owner inside the cover when the notebook belongs to the current user', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId="notebook-1"
        notebookName="Own Notebook"
        notebookDescription=""
        notebookSourceCount={1}
        notebookCoverUrl="https://cdn.example.com/covers/notebook-1.webp"
      />,
    )

    expect(html).not.toContain('data-testid="chat-notebook-owner"')
    expect(html).toContain('Own Notebook')
  })

  it('shows emoji with owner beside it when there is no cover', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId="notebook-7"
        notebookName="Shared Notebook"
        notebookDescription=""
        notebookSourceCount={2}
        notebookOwner={{ nickname: 'Bob', avatarUrl: '' }}
      />,
    )

    expect(html).toContain('data-testid="chat-notebook-emoji"')
    expect(html).toContain('data-testid="chat-notebook-owner"')
    expect(html).toContain('Bob')
    expect(html).not.toContain('data-testid="chat-notebook-cover"')
  })

  it('shows source count and created date under the title', () => {
    const createdAt = Date.UTC(2026, 0, 30)
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId="notebook-8"
        notebookName="Dated Notebook"
        notebookDescription=""
        notebookSourceCount={97}
        notebookCreatedAt={createdAt}
      />,
    )

    expect(html).toContain('data-testid="chat-notebook-meta"')
    expect(html).toContain(`97 个来源 · ${formatNotebookDate(createdAt)}`)
  })

  it('falls back to the UUIDv7 timestamp when created_at is missing', () => {
    const notebookId = '01a14e5488b77579bd27f5111ce567de'
    const expected = formatNotebookDate(Number.parseInt(notebookId.slice(0, 12), 16))
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId={notebookId}
        notebookName="Fallback Date"
        notebookDescription=""
        notebookSourceCount={4}
      />,
    )

    expect(html).toContain(`4 个来源 · ${expected}`)
  })

  it('uses fallback title and keeps empty description as blank placeholder', () => {
    const html = renderToStaticMarkup(
      <ChatNotebookInfoHeader
        notebookId="notebook-2"
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
        notebookId="notebook-3"
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
        notebookId="notebook-4"
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
        notebookId="notebook-5"
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
        notebookId="notebook-6"
        notebookName="Empty Notebook"
        notebookDescription=""
        notebookSourceCount={0}
        customizeDescription={false}
      />,
    )

    expect(html).not.toContain('chat-notebook-description-origin-')
  })
})
