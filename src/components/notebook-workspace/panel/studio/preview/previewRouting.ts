import type { StudioArtifactKind, StudioArtifactTaskStatus } from '@/types/api'
import { isStudioTaskCompleted } from '../artifactStatus'
import { getStudioArtifactPreviewCapability } from './previewCapabilities'

export type StudioPreviewEntryMode = 'none' | 'inline' | 'overlay'

interface ResolveStudioPreviewEntryModeParams {
  kind: StudioArtifactKind
  status: StudioArtifactTaskStatus
}

export const resolveStudioPreviewEntryMode = ({
  kind,
  status,
}: ResolveStudioPreviewEntryModeParams): StudioPreviewEntryMode => {
  if (!isStudioTaskCompleted(status)) {
    return 'none'
  }
  const capability = getStudioArtifactPreviewCapability(kind)
  if (capability.inline) {
    return 'inline'
  }
  if (capability.overlay) {
    return 'overlay'
  }
  return 'none'
}
