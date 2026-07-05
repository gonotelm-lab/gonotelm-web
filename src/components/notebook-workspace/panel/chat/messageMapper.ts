import type { ChatMessage, MessageCitation, MessageFragment } from '@/types/api'
import type { ChatUiCitation, ChatUiCitationDetail, ChatUiFragment, ChatUiMessage } from './types'

function mapFragment(fragment: MessageFragment): ChatUiFragment {
  const base = { id: fragment.id, type: fragment.type }
  switch (fragment.type) {
    case 'REQUEST':
      return {
        ...base,
        request: { content: fragment.request?.content?.text?.content ?? '' },
      }
    case 'THINK':
      return {
        ...base,
        think: {
          status: fragment.think?.status ?? 'FINISHED',
          content: fragment.think?.content?.content ?? '',
        },
      }
    case 'PHASE':
      return {
        ...base,
        phase: {
          summary: fragment.phase?.summary ?? '',
          thought: fragment.phase?.thought ?? '',
        },
      }
    case 'RESPONSE':
      return {
        ...base,
        response: {
          status: fragment.response?.status ?? 'FINISHED',
          content: fragment.response?.content?.text?.content ?? '',
        },
      }
    default:
      return base as ChatUiFragment
  }
}

export function mapApiCitationToUi(citation: MessageCitation): ChatUiCitation {
  return {
    docId: citation.doc_id,
    sourceId: citation.source_id,
  }
}

export function mapChatMessageToUi(message: ChatMessage): ChatUiMessage {
  const role = String(message.role).toLowerCase() === 'user' ? 'user' : 'assistant'
  return {
    id: message.id,
    role,
    fragments: (message.fragments ?? []).map(mapFragment),
    citations: (message.citations ?? []).map(mapApiCitationToUi),
  }
}

export function buildCitationDetails(citations: ChatUiCitation[]): ChatUiCitationDetail[] {
  return citations.map((citation, index) => ({
    marker: `[[${index + 1}]]`,
    citationIndex: index + 1,
    docId: citation.docId,
    sourceId: citation.sourceId,
  }))
}
