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
