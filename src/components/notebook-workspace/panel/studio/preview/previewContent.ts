import type { StudioArtifactKind } from '@/types/api'

export const hasStudioArtifactPreviewContent = (
  kind: StudioArtifactKind,
  content: string,
  contentUrl: string,
) => {
  if (kind === 'info_graphic') {
    return Boolean(contentUrl.trim())
  }
  return Boolean(content.trim())
}
