export type SourceKind = 'text' | 'url' | 'file'

export type SourceStatus = 'inited' | 'uploading' | 'preparing' | 'ready' | 'failed'

export interface SourceParsedContent {
  url?: string
}

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
  updated_at: number
}

export interface NotebookSummary {
  id: string
  name: string
  desc: string
  source_count: number
  updated_at: number
}

export type ListNotebooksSortBy = 'last_active' | 'create_time'

export interface NotebookSource {
  id: string
  kind: SourceKind
  status: SourceStatus
  title: string
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
  parsed_content?: SourceParsedContent
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

export interface SourceDocPosition {
  start?: number
  end?: number
  bytes_start?: number
  bytes_end?: number
}

export interface GetSourceDocResponse {
  source_id: string
  doc_id: string
  source_title: string
  content: string
  position?: SourceDocPosition
}

export type GetSourceResponse = NotebookSource

export interface GetSourceParsedContentResponse {
  url?: string
}

export type StudioArtifactKind =
  | 'mindmap'
  | 'report'
  | 'info_graphic'
  | 'audio_overview'
  | 'flashcard'
  | 'quiz'

export type StudioArtifactFlashcardCount = 'few' | 'default' | 'many'
export type StudioArtifactFlashcardDifficulty = 'easy' | 'medium' | 'hard'
export type StudioArtifactQuizCount = 'few' | 'default' | 'many'
export type StudioArtifactQuizDifficulty = 'easy' | 'medium' | 'hard'

export type StudioArtifactTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'

export type StudioArtifactContentKind = 'inline' | 'storage'

export type StudioArtifactInfoGraphicOrientation = 'portrait' | 'landscape' | 'square'
export type StudioArtifactInfoGraphicDetailLevel = 'concise' | 'standard' | 'detailed'
export type StudioArtifactInfoGraphicVisualStyle =
  | 'default'
  | 'hand-drawn'
  | 'anime'
  | 'cute'
  | 'educational'
  | 'minimal-2.5d'
export type StudioArtifactAudioOverviewStyle =
  | 'deep-research'
  | 'abstract'
  | 'discussion'
  | 'debate'

export type StudioArtifactReportStyle =
  | 'default'
  | 'brief'
  | 'study-guide'
  | 'detailed'

export interface GenerateMindmapParameters {
  tip?: string
}

export interface GenerateReportParameters {
  style?: StudioArtifactReportStyle
  language?: string
  tip?: string
}

export interface GenerateInfoGraphicParameters {
  orientation?: StudioArtifactInfoGraphicOrientation
  text_language?: string
  extra_prompt?: string
  detail_level?: StudioArtifactInfoGraphicDetailLevel
  visual_style?: StudioArtifactInfoGraphicVisualStyle
}

export interface GenerateAudioOverviewParameters {
  tip?: string
  language: string
  style?: StudioArtifactAudioOverviewStyle
}

export interface GenerateFlashcardParameters {
  count?: StudioArtifactFlashcardCount
  difficulty?: StudioArtifactFlashcardDifficulty
  tip?: string
}

export interface GenerateQuizParameters {
  count?: StudioArtifactQuizCount
  difficulty?: StudioArtifactQuizDifficulty
  tip?: string
}

export interface MindmapArtifactExtras {
  tip?: string
}

export interface ReportArtifactExtras {
  style?: string
  language?: string
  tip?: string
}

export interface AudioOverviewArtifactExtras {
  tip?: string
  language?: string
  style?: string
  format?: string
  channels?: number
  sample_rate?: number
  duration_ms?: number
}

export interface InfoGraphicArtifactExtras {
  prompt?: string
  text_language?: string
  orientation?: StudioArtifactInfoGraphicOrientation
  detail_level?: StudioArtifactInfoGraphicDetailLevel
  visual_style?: StudioArtifactInfoGraphicVisualStyle
}

export interface FlashcardArtifactExtras {
  count?: string
  difficulty?: string
  tip?: string
}

export interface QuizArtifactExtras {
  count?: string
  difficulty?: string
  tip?: string
}

export interface StudioArtifactImageInfo {
  width: number
  height: number
}

export interface GenerateStudioArtifactRequest {
  notebook_id: string
  kind: StudioArtifactKind
  source_ids: string[]
  mindmap?: GenerateMindmapParameters
  report?: GenerateReportParameters
  info_graphic?: GenerateInfoGraphicParameters
  audio_overview?: GenerateAudioOverviewParameters
  flashcard?: GenerateFlashcardParameters
  quiz?: GenerateQuizParameters
}

export interface GenerateStudioArtifactResponse {
  task_id: string
}

export interface GetStudioArtifactStatusResponse {
  task_id: string
  status: StudioArtifactTaskStatus
}

export interface StudioArtifactResult {
  notebook_id: string
  task_id: string
  kind: StudioArtifactKind
  status: StudioArtifactTaskStatus
  title?: string
  source_ids?: string[]
  timestamp?: number
  content?: string
  content_url?: string
  content_kind: StudioArtifactContentKind
  mime_type?: string
  image_info?: StudioArtifactImageInfo
  extras?:
    | MindmapArtifactExtras
    | ReportArtifactExtras
    | InfoGraphicArtifactExtras
    | AudioOverviewArtifactExtras
    | FlashcardArtifactExtras
    | QuizArtifactExtras
}

export interface ListNotebookStudioArtifactsResponse {
  artifacts: StudioArtifactResult[]
  limit: number
  offset: number
  has_more: boolean
}

export type ChatMessageRole = 'user' | 'assistant'

export type FragmentType = 'REQUEST' | 'THINK' | 'PHASE' | 'RESPONSE'
export type FragmentStatus = 'RUNNING' | 'FINISHED'

export interface FragmentContentText {
  content: string
}

export interface FragmentContentUnion {
  type: 'text'
  text?: FragmentContentText
}

export interface FragmentRequest {
  content?: FragmentContentUnion
}

export interface FragmentThink {
  status: FragmentStatus
  content?: FragmentContentText
}

export interface FragmentPhase {
  status: FragmentStatus
  summary: string
  thought: string
}

export interface FragmentResponse {
  status: FragmentStatus
  content?: FragmentContentUnion
}

export interface MessageFragment {
  id: number
  type: FragmentType
  request?: FragmentRequest
  think?: FragmentThink
  phase?: FragmentPhase
  response?: FragmentResponse
}

export interface MessageCitation {
  doc_id: string
  source_id: string
}

export interface ChatMessage {
  id: string
  create_time: number
  update_time: number
  chat_id: string
  user_id: string
  role: ChatMessageRole
  fragments?: MessageFragment[]
  seq_no: number
  citations?: MessageCitation[]
}

export interface ChatCreateMessageRequest {
  id: string
  prompt: string
  source_ids?: string[]
  enable_thinking?: boolean
  style?: ChatStyle
  answer_length?: ChatAnswerLength
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
  messages: ChatMessage[]
  limit: number
  has_more: boolean
  next_cursor: number
}

export type ChatStyle = 'default' | 'analyst' | 'guide'
export type ChatAnswerLength = 'default' | 'longer' | 'shorter'

export type EventAction = 'INIT' | 'APPEND' | 'SET' | 'NEW'

export type StreamEventTargetPath =
  | 'm'
  | 'm.citations'
  | 'm.f.tk'
  | 'm.f.tk.v'
  | 'm.f.tk.st'
  | 'm.f.rsp'
  | 'm.f.rsp.v'
  | 'm.f.rsp.st'
  | 'm.f.phase'

export interface StreamTaskEventThink {
  st?: FragmentStatus
  v?: string
}

export interface StreamTaskEventResponse {
  st?: FragmentStatus
  v?: FragmentContentUnion
}

export interface StreamTaskEventPhase {
  phase?: FragmentPhase
}

export interface StreamTaskEventError {
  message?: string
}

export interface StreamTaskEvent {
  id: string
  ct?: number
  op?: EventAction
  p?: StreamEventTargetPath
  idx?: number
  message?: ChatMessage
  citations?: MessageCitation[]
  tk?: StreamTaskEventThink
  rsp?: StreamTaskEventResponse
  phase?: StreamTaskEventPhase
  error?: StreamTaskEventError
  /** 流结束标记，与 error 二选一作为最后一个事件 */
  done?: boolean
}

export interface StreamHeartbeatEvent {
  heartbeat: string
}
