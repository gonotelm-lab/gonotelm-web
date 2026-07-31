import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  resolvePhaseStatusLabel,
  resolveStickyPhaseStatusLabel,
  shouldShowPhaseStatus,
  THINKING_PHASE_LABEL,
} from './chatMessageFragmentsHelpers'
import { ChatMessageFragments } from './ChatMessageFragments'
import type { ChatUiMessage } from './types'

vi.mock('./AssistantMarkdown', () => ({
  AssistantMarkdown: ({ content }: { content: string }) =>
    createElement('div', { 'data-testid': 'assistant-markdown' }, content),
}))

describe('resolvePhaseStatusLabel', () => {
  it('falls back to thinking label before first phase arrives', () => {
    const message: ChatUiMessage = {
      id: 'a0',
      role: 'assistant',
      citations: [],
      fragments: [],
    }

    expect(resolvePhaseStatusLabel(message)).toBe(THINKING_PHASE_LABEL)
  })

  it('uses latest phase summary until next phase replaces it', () => {
    const message: ChatUiMessage = {
      id: 'a0b',
      role: 'assistant',
      citations: [],
      fragments: [
        { id: 1, type: 'PHASE', phase: { summary: '检索证据', thought: 'hidden' } },
        { id: 2, type: 'PHASE', phase: { summary: '整理回答', thought: 'hidden' } },
      ],
    }

    expect(resolvePhaseStatusLabel(message)).toBe('整理回答')
  })
})

describe('resolveStickyPhaseStatusLabel', () => {
  it('keeps previous phase label while think fragments stream without new phase', () => {
    const message: ChatUiMessage = {
      id: 'sticky-1',
      role: 'assistant',
      citations: [],
      fragments: [
        { id: 1, type: 'PHASE', phase: { summary: '检索证据', thought: '' } },
        { id: 2, type: 'THINK', think: { status: 'RUNNING', content: 'detail' } },
      ],
    }

    expect(resolveStickyPhaseStatusLabel(message, THINKING_PHASE_LABEL, true)).toBe('检索证据')
    expect(resolveStickyPhaseStatusLabel(message, '检索证据', true)).toBe('检索证据')
  })
})

describe('shouldShowPhaseStatus', () => {
  it('keeps loading visible for active assistant until response content arrives', () => {
    expect(
      shouldShowPhaseStatus({
        isActiveAssistant: true,
        fragments: [{ id: 1, type: 'PHASE', phase: { summary: '检索证据', thought: '' } }],
      }),
    ).toBe(true)
  })

  it('keeps loading visible even after response content arrives', () => {
    expect(
      shouldShowPhaseStatus({
        isActiveAssistant: true,
        fragments: [
          { id: 1, type: 'PHASE', phase: { summary: '检索证据', thought: '' } },
          { id: 2, type: 'RESPONSE', response: { status: 'RUNNING', content: '回答' } },
        ],
      }),
    ).toBe(true)
  })
})

describe('ChatMessageFragments', () => {
  it('hides phase status once response content is available', () => {
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

    expect(html).not.toContain('检索证据')
    expect(html).not.toContain('思考中')
    expect(html).not.toContain('phase detail')
    expect(html).not.toContain('think detail')
    expect(html).toContain('assistant-markdown')
    expect(html).toContain('## Rust')
    expect(html).toContain('**所有权**很重要')
  })

  it('renders markdown response while active assistant is streaming', () => {
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

    expect(html).toContain('assistant-markdown')
    expect(html).toContain('思考中')
    expect(html).toContain('## Rust')
    expect(html).toContain('**所有权**很重要')
  })

  it('shows thinking status before first phase arrives for active assistant', () => {
    const message: ChatUiMessage = {
      id: 'a3',
      role: 'assistant',
      citations: [],
      fragments: [],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isActiveAssistant />,
    )

    expect(html).toContain('思考中')
    expect(html).toContain('MuiCircularProgress')
    expect(html).not.toContain('assistant-markdown')
  })

  it('shows thinking status while waiting for stream task even before isStreaming is true', () => {
    const message: ChatUiMessage = {
      id: 'a3b',
      role: 'assistant',
      citations: [],
      fragments: [],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isActiveAssistant />,
    )

    expect(html).toContain('思考中')
    expect(html).toContain('MuiCircularProgress')
  })

  it('does not render think fragment content during active stream', () => {
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
      <ChatMessageFragments message={message} isActiveAssistant />,
    )

    expect(html).not.toContain('分析上下文')
    expect(html).toContain('思考中')
    expect(html).toContain('MuiCircularProgress')
  })

  it('renders latest phase summary with loading indicator until content arrives', () => {
    const message: ChatUiMessage = {
      id: 'a5',
      role: 'assistant',
      citations: [],
      fragments: [
        {
          id: 1,
          type: 'PHASE',
          phase: { summary: '检索证据', thought: 'hidden detail' },
        },
      ],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isActiveAssistant />,
    )

    expect(html).toContain('检索证据')
    expect(html).not.toContain('hidden detail')
    expect(html).not.toContain('思考中')
    expect(html).toContain('MuiCircularProgress')
  })

  it('keeps phase status visible when only think fragments arrive after phase', () => {
    const message: ChatUiMessage = {
      id: 'a5b',
      role: 'assistant',
      citations: [],
      fragments: [
        {
          id: 1,
          type: 'PHASE',
          phase: { summary: '检索证据', thought: 'hidden detail' },
        },
        {
          id: 2,
          type: 'THINK',
          think: { status: 'RUNNING', content: '分析上下文' },
        },
      ],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isActiveAssistant />,
    )

    expect(html).toContain('检索证据')
    expect(html).not.toContain('分析上下文')
    expect(html).toContain('MuiCircularProgress')
  })

  it('keeps phase status visible when response streams', () => {
    const message: ChatUiMessage = {
      id: 'a6',
      role: 'assistant',
      citations: [],
      fragments: [
        {
          id: 1,
          type: 'PHASE',
          phase: { summary: '检索证据', thought: 'hidden detail' },
        },
        {
          id: 2,
          type: 'RESPONSE',
          response: { status: 'RUNNING', content: '正在生成回答' },
        },
      ],
    }

    const html = renderToStaticMarkup(
      <ChatMessageFragments message={message} isStreaming isActiveAssistant />,
    )

    expect(html).toContain('检索证据')
    expect(html).not.toContain('思考中')
    expect(html).toContain('正在生成回答')
  })
})
