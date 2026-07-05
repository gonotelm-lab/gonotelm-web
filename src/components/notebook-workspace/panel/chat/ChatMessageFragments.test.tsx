import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ChatMessageFragments } from './ChatMessageFragments'
import type { ChatUiMessage } from './types'

vi.mock('./AssistantMarkdown', () => ({
  AssistantMarkdown: ({ content }: { content: string }) =>
    createElement('div', { 'data-testid': 'assistant-markdown' }, content),
}))

describe('ChatMessageFragments', () => {
  it('renders unified thinking block and combined RESPONSE markdown', () => {
    const message: ChatUiMessage = {
      id: 'a1',
      role: 'assistant',
      citations: [],
      fragments: [
        {
          id: 1,
          type: 'PHASE',
          phase: { summary: '检索证据', thought: 'phase detail' },
        },
        {
          id: 2,
          type: 'THINK',
          think: { status: 'FINISHED', content: 'think detail' },
        },
        {
          id: 3,
          type: 'RESPONSE',
          response: { status: 'FINISHED', content: '## Rust\n\n**所有权**很重要' },
        },
      ],
    }

    const html = renderToStaticMarkup(<ChatMessageFragments message={message} />)

    expect(html).toContain('思考过程')
    expect(html).toContain('检索证据')
    expect(html).toContain('phase detail')
    expect(html).toContain('think detail')
    expect(html).toContain('assistant-markdown')
    expect(html).toContain('## Rust')
    expect(html).toContain('**所有权**很重要')
  })

  it('renders plain text response while active assistant is streaming', () => {
    const message: ChatUiMessage = {
      id: 'a2',
      role: 'assistant',
      citations: [],
      fragments: [
        {
          id: 1,
          type: 'RESPONSE',
          response: { status: 'RUNNING', content: '## Rust\n\n**所有权**很重要' },
        },
      ],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isStreaming isActiveAssistant />,
    )

    expect(html).not.toContain('assistant-markdown')
    expect(html).toContain('## Rust')
    expect(html).toContain('**所有权**很重要')
  })

  it('shows thinking placeholder at stream start before fragments arrive', () => {
    const message: ChatUiMessage = {
      id: 'a3',
      role: 'assistant',
      citations: [],
      fragments: [],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isStreaming isActiveAssistant />,
    )

    expect(html).toContain('思考中')
    expect(html).not.toContain('assistant-markdown')
  })

  it('streams think content with running cursor during active stream', () => {
    const message: ChatUiMessage = {
      id: 'a4',
      role: 'assistant',
      citations: [],
      fragments: [
        {
          id: 1,
          type: 'THINK',
          think: { status: 'RUNNING', content: '分析上下文' },
        },
      ],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isStreaming isActiveAssistant />,
    )

    expect(html).toContain('分析上下文')
    expect(html).toContain('思考中')
  })
})
