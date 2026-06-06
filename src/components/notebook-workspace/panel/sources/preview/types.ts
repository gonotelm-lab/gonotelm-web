export type SourcePreviewViewType = 'content' | 'tree'

export type SourcePreviewEntryMode = 'none' | 'inline' | 'overlay'

export interface SourcePreviewCapability {
  inline: boolean
  overlay: boolean
  downloadable: boolean
}
