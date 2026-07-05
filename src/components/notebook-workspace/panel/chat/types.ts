export interface ChatUiCitationPosition {
  start: number
  end: number
  bytesStart?: number
  bytesEnd?: number
}

export interface ChatUiCitationDetail {
  marker: string
  citationIndex: number
  docId: string
  sourceId?: string
  isSummary?: boolean
  position?: ChatUiCitationPosition
}

export interface ChatCitationJumpRequest {
  sourceId: string
  sourceTitle?: string
  position?: ChatUiCitationPosition
  snippet?: string
}

export type ChatUiFragmentType = 'REQUEST' | 'THINK' | 'PHASE' | 'RESPONSE'

export interface ChatUiFragment {
  id: number
  type: ChatUiFragmentType
  request?: { content: string }
  think?: { status: string; content: string }
  phase?: { summary: string; thought: string }
  response?: { status: string; content: string }
}

export interface ChatUiCitation {
  docId: string
  sourceId: string
}

export interface ChatUiMessage {
  id: string
  role: 'user' | 'assistant'
  fragments: ChatUiFragment[]
  citations: ChatUiCitation[]
}
