export type SourceKind = 'text' | 'url' | 'file'

export type SourceStatus = 'inited' | 'uploading' | 'preparing' | 'ready' | 'failed'

export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

export interface Notebook {
  id: string
  name: string
  desc: string
  source_count: number
}

export interface NotebookSummary {
  id: string
  name: string
  desc: string
  source_count: number
}

export interface NotebookSource {
  id: string
  kind: SourceKind
  status: SourceStatus
  display_name: string
  text?: {
    text: string
  }
  url?: {
    url: string
  }
  file?: {
    url: string
    filename: string
    format: string
  }
}

export interface CreateNotebookRequest {
  name: string
  desc: string
}

export interface CreateNotebookResponse {
  id: string
}

export interface ListNotebooksResponse {
  notebooks: NotebookSummary[]
  limit: number
  offset: number
  has_more: boolean
}

export interface GetNotebookChatResponse {
  chat_id: string
}

export interface ListNotebookSourcesResponse {
  sources: NotebookSource[]
  limit: number
  offset: number
  has_more: boolean
}

export interface CreateSourceRequest {
  notebook_id: string
  kind: SourceKind
  text?: string
  url?: string
}

export interface CreateSourceResponse {
  id: string
}

export interface UploadFileSourceRequest {
  mime_type: string
  filename: string
  size: number
  md5: string
}

export interface UploadFileSourceResponse {
  url: string
  method: string
  forms?: Record<string, string>
  headers?: Record<string, string>
}

export interface PollSourceStatusResponse {
  status: SourceStatus
}

export interface GetSourceDocResponse {
  source_id: string
  doc_id: string
  source_title: string
  content: string
}

export type ChatMessageRole = 'user' | 'assistant'

export interface ChatMessageContentText {
  content: string
}

export interface ChatMessageContent {
  created_at: number
  kind: string
  text?: ChatMessageContentText
}

export interface ChatMessageCitationItem {
  source_id: string
  doc_ids?: string[]
}

export type ChatMessageCitation = ChatMessageCitationItem[]

export interface ChatMessageListItem {
  id: string
  chat_id: string
  role: ChatMessageRole
  content?: ChatMessageContent
  citation?: ChatMessageCitation
}

export interface ChatCreateMessageRequest {
  id: string
  prompt: string
  source_ids?: string[]
  enable_thinking?: boolean
}

export interface ChatCreateMessageResponse {
  msg_id: string
  task_id: string
}

export interface ChatAbortStreamRequest {
  id: string
  task_id: string
}

export interface ChatListMessagesResponse {
  messages: ChatMessageListItem[]
  limit: number
  has_more: boolean
  next_cursor: number
}

export type MessageStreamPhaseType = 'retrieving' | 'thinking' | 'answer'
export type MessageStreamPhaseStatus = 'typing' | 'finished'
export type MessageStreamPhaseContentAction = 'continue' | 'override' | string
export type ChatMessageStreamFinishReason = 'stop' | 'length' | 'content_filter' | string

export interface ChatMessageStreamCitationDocPosition {
  start: number
  end: number
}

export interface ChatMessageStreamCitationDoc {
  id?: string
  position?: ChatMessageStreamCitationDocPosition
}

export interface ChatMessageStreamCitationItem {
  source_id?: string
  docs?: ChatMessageStreamCitationDoc[]
}

export type ChatMessageStreamCitation = ChatMessageStreamCitationItem[]

export interface ChatMessageStreamPhase {
  type: MessageStreamPhaseType
  status: MessageStreamPhaseStatus
  content?: string
  action?: MessageStreamPhaseContentAction
  citation?: ChatMessageStreamCitation
}

export interface ChatMessageStreamEvent {
  id: number
  heartbeat?: string
  phase?: ChatMessageStreamPhase
  finished?: boolean
  finish_reason?: ChatMessageStreamFinishReason
  timestamp: number
  extra?: Record<string, unknown>
  stream_id?: string
}
