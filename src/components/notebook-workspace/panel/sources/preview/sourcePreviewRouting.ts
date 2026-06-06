import type { SourceStatus } from '@/types/api'
import { getSourcePreviewCapability } from './sourcePreviewCapabilities'
import type { SourcePreviewEntryMode, SourcePreviewViewType } from './types'

interface ResolveSourcePreviewEntryModeParams {
  viewType: SourcePreviewViewType
  status?: SourceStatus
}

export const resolveSourcePreviewEntryMode = ({
  viewType,
  status,
}: ResolveSourcePreviewEntryModeParams): SourcePreviewEntryMode => {
  if (status !== 'ready') {
    return 'none'
  }
  const capability = getSourcePreviewCapability(viewType)
  if (capability.inline) {
    return 'inline'
  }
  if (capability.overlay) {
    return 'overlay'
  }
  return 'none'
}
