import type { MessageCitation, StreamTaskEvent } from '@/types/api'
import type { ChatUiCitation, ChatUiFragment, ChatUiMessage } from './types'

export function createEmptyAssistantMessage(id: string): ChatUiMessage {
  return { id, role: 'assistant', fragments: [], citations: [] }
}

function resolveFragmentIndex(fragments: ChatUiFragment[], index?: number): number {
  if (index === undefined) {
    return fragments.length - 1
  }
  if (index < 0) {
    return fragments.length + index
  }
  return index
}

function ensureFragment(
  msg: ChatUiMessage,
  type: ChatUiFragment['type'],
  index: number,
): ChatUiFragment {
  let fragment = msg.fragments[index]
  if (!fragment || fragment.type !== type) {
    fragment = { id: msg.fragments.length + 1, type }
    msg.fragments.push(fragment)
  }
  return fragment
}

export function mapStreamCitationToUi(citation: MessageCitation): ChatUiCitation {
  return {
    docId: citation.doc_id,
    sourceId: citation.source_id,
  }
}

const readResponseTextChunk = (event: StreamTaskEvent) =>
  event.rsp?.v?.text?.content ?? ''

export function cloneChatUiMessage(msg: ChatUiMessage): ChatUiMessage {
  return {
    ...msg,
    fragments: msg.fragments.map((fragment) => ({ ...fragment })),
    citations: msg.citations.map((citation) => ({ ...citation })),
  }
}

export function applyStreamEventInPlace(msg: ChatUiMessage, event: StreamTaskEvent): void {
  if (event.error?.message) {
    return
  }

  switch (event.p) {
    case 'm':
      if (event.op === 'INIT' && event.message) {
        msg.id = event.message.id
      }
      break

    case 'm.citations':
      if (event.op === 'SET' && event.citations) {
        msg.citations = event.citations.map(mapStreamCitationToUi)
      }
      break

    case 'm.f.tk':
      if (event.op === 'NEW') {
        msg.fragments.push({
          id: msg.fragments.length + 1,
          type: 'THINK',
          think: { status: 'RUNNING', content: '' },
        })
      }
      break

    case 'm.f.tk.v': {
      const idx = resolveFragmentIndex(msg.fragments, event.idx)
      const fragment = ensureFragment(msg, 'THINK', idx)
      if (event.op === 'APPEND' && event.tk?.v) {
        const think = fragment.think ?? { status: 'RUNNING' as const, content: '' }
        think.content = `${think.content ?? ''}${event.tk.v}`
        think.status = think.status ?? 'RUNNING'
        fragment.think = think
      }
      break
    }

    case 'm.f.tk.st': {
      const idx = resolveFragmentIndex(msg.fragments, event.idx)
      const fragment = msg.fragments[idx]
      if (fragment?.think && event.tk?.st) {
        fragment.think.status = event.tk.st
      }
      break
    }

    case 'm.f.phase':
      if (event.op === 'NEW' && event.phase?.phase) {
        msg.fragments.push({
          id: msg.fragments.length + 1,
          type: 'PHASE',
          phase: {
            summary: event.phase.phase.summary,
            thought: event.phase.phase.thought,
          },
        })
      }
      break

    case 'm.f.rsp':
      if (event.op === 'NEW') {
        msg.fragments.push({
          id: msg.fragments.length + 1,
          type: 'RESPONSE',
          response: { status: 'RUNNING', content: '' },
        })
      }
      break

    case 'm.f.rsp.v': {
      const idx = resolveFragmentIndex(msg.fragments, event.idx)
      const fragment = ensureFragment(msg, 'RESPONSE', idx)
      const chunk = readResponseTextChunk(event)
      if (event.op === 'APPEND' && chunk) {
        const response = fragment.response ?? { status: 'RUNNING' as const, content: '' }
        response.content = `${response.content ?? ''}${chunk}`
        response.status = response.status ?? 'RUNNING'
        fragment.response = response
      } else if (event.op === 'SET' && chunk) {
        fragment.response = {
          status: fragment.response?.status ?? 'RUNNING',
          content: chunk,
        }
      }
      break
    }

    case 'm.f.rsp.st': {
      const idx = resolveFragmentIndex(msg.fragments, event.idx)
      const fragment = msg.fragments[idx]
      if (fragment?.response && event.rsp?.st) {
        fragment.response.status = event.rsp.st
      }
      break
    }
  }
}

export function applyStreamEvent(msg: ChatUiMessage, event: StreamTaskEvent): ChatUiMessage {
  const next = cloneChatUiMessage(msg)
  applyStreamEventInPlace(next, event)
  return next
}

export function extractLatestPhaseSummary(msg: ChatUiMessage): string {
  for (let index = msg.fragments.length - 1; index >= 0; index -= 1) {
    const summary = msg.fragments[index]?.phase?.summary
    if (summary) {
      return summary
    }
  }
  return ''
}

export function extractResponseText(msg: ChatUiMessage): string {
  return msg.fragments
    .filter((fragment) => fragment.type === 'RESPONSE')
    .map((fragment) => fragment.response?.content ?? '')
    .join('\n')
}
