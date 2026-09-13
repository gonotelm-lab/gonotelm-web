import { getStudioArtifact } from '@/api/studio'
import { isPresignedGetUrlExpired } from './presignedUrlExpiry'

export function isUrlBasedStudioArtifactKind(kind: string): boolean {
  return (
    kind === 'slides' ||
    kind === 'info_graphic' ||
    kind === 'audio_overview' ||
    kind === 'video_overview'
  )
}

/**
 * If the cached content_url is already past SigV4 expiry, re-fetch artifact for a fresh presign.
 * Does not refresh early — only when expired (or url empty while taskId is known).
 */
export async function ensureFreshStudioContentUrl(params: {
  taskId: string
  contentUrl: string
  forceRefresh?: boolean
}): Promise<{ contentUrl: string; refreshed: boolean }> {
  const current = params.contentUrl.trim()
  const needsRefresh =
    Boolean(params.forceRefresh) || !current || isPresignedGetUrlExpired(current)

  if (!needsRefresh) {
    return { contentUrl: current, refreshed: false }
  }

  const result = await getStudioArtifact(params.taskId)
  const next = (result.content_url ?? '').trim()
  return {
    contentUrl: next || current,
    refreshed: true,
  }
}
