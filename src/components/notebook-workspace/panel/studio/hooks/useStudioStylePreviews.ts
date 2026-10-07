import { useQuery } from '@tanstack/react-query'
import { listStudioStylePreviews } from '@/api/studio'
import type { StudioArtifactKind } from '@/types/api'

export const studioStylePreviewsQueryKey = (kind: StudioArtifactKind) =>
  ['studio', 'style-previews', kind] as const

/** Style previews are seeded catalog art; they rarely change within a session. */
const STYLE_PREVIEWS_STALE_TIME_MS = 5 * 60 * 1000

/**
 * Backend-driven previewable styles for an artifact kind.
 *
 * Callers must fall back to their hardcoded list on error or an empty result —
 * `data` stays `undefined` while disabled/loading, so gate the fallback on
 * `data` rather than on `isLoading`.
 */
export function useStudioStylePreviews(
  kind: StudioArtifactKind,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: studioStylePreviewsQueryKey(kind),
    queryFn: () => listStudioStylePreviews(kind),
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: STYLE_PREVIEWS_STALE_TIME_MS,
  })
}
