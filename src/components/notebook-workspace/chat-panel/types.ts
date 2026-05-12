export interface ChatUiCitationDetail {
  marker: string
  sourceIndex: number
  docIndex: number
  sourceId?: string
  docId?: string
}

export interface ChatUiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citationDetails?: ChatUiCitationDetail[]
}
