import type { SourceKind, SourceStatus } from '../../types/api'

export type SourceIconType =
  | 'text'
  | 'url'
  | 'pdf'
  | 'epub'
  | 'docx'
  | 'txt'
  | 'markdown'

export interface SourceListItem {
  id: string
  kind: SourceKind
  name: string
  iconType: SourceIconType
  status?: SourceStatus
  textContent?: string
  urlContent?: string
  fileUrl?: string
}
