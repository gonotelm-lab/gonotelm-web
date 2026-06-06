import type { SourcePreviewCapability, SourcePreviewViewType } from './types'

const sourcePreviewCapabilityByViewType: Record<SourcePreviewViewType, SourcePreviewCapability> = {
  content: {
    inline: true,
    overlay: true,
    downloadable: true,
  },
  tree: {
    inline: true,
    overlay: true,
    downloadable: false,
  },
}

export const getSourcePreviewCapability = (
  viewType: SourcePreviewViewType,
): SourcePreviewCapability => sourcePreviewCapabilityByViewType[viewType]
