import type { SourceKind, SourceStatus } from '@/types/api'

export type SourceIconType =
  | 'text'
  | 'url'
  | 'pdf'
  | 'epub'
  | 'docx'
  | 'txt'
  | 'markdown'
  | 'csv'

export interface SourceListItem {
  id: string
  kind: SourceKind
  title: string
  name: string
  iconType: SourceIconType
  status?: SourceStatus
  textContent?: string
  urlContent?: string
  fileFormat?: string
  fileUrl?: string
  parsedContentUrl?: string
}
