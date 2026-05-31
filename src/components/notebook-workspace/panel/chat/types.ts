export interface ChatUiCitationPosition {
  start: number
  end: number
  bytesStart?: number
  bytesEnd?: number
}

export interface ChatUiCitationDetail {
  marker: string
  sourceIndex: number
  docIndex: number
  sourceId?: string
  docId?: string
  isSummary?: boolean
  position?: ChatUiCitationPosition
}

export interface ChatCitationJumpRequest {
  sourceId: string
  sourceTitle?: string
  position?: ChatUiCitationPosition
  snippet?: string
}

export interface ChatUiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citationDetails?: ChatUiCitationDetail[]
}
