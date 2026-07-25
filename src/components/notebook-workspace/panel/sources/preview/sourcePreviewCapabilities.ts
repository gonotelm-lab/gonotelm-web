import type { SourcePreviewCapability, SourcePreviewViewType } from './types'

const sourcePreviewCapabilityByViewType: Record<SourcePreviewViewType, SourcePreviewCapability> = {
  content: {
    inline: true,
    overlay: true,
    downloadable: true,
  },
}

export const getSourcePreviewCapability = (
  viewType: SourcePreviewViewType,
): SourcePreviewCapability => sourcePreviewCapabilityByViewType[viewType]
