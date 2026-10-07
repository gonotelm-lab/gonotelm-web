import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { listStudioStylePreviews } from '@/api/studio'
import type { ListStudioStylePreviewsResponse, StudioArtifactKind } from '@/types/api'
import { studioStylePreviewsQueryKey } from './useStudioStylePreviews'

export type VisualStyleParamsResolver<TParams> = (
  params: TParams,
  previews: ListStudioStylePreviewsResponse | null | undefined,
) => TParams

/**
 * Confirms an artifact kind's supported styles at submit time.
 *
 * A user can generate without ever opening the settings dialog, so the supported
 * styles (and the backend default) must be resolved when the task is submitted,
 * not only when the dialog mounts. Always fetches a fresh list; a failure falls
 * back to the kind's hardcoded styles so an offline endpoint never blocks
 * generation.
 */
export function useStudioVisualStyleResolver<TParams>(
  kind: StudioArtifactKind,
  resolveParams: VisualStyleParamsResolver<TParams>,
): (params: TParams) => Promise<TParams> {
  const queryClient = useQueryClient()

  return useCallback(
    async (params: TParams): Promise<TParams> => {
      let previews: ListStudioStylePreviewsResponse | undefined
      try {
        previews = await queryClient.ensureQueryData({
          queryKey: studioStylePreviewsQueryKey(kind),
          queryFn: () => listStudioStylePreviews(kind),
          staleTime: 0,
          retry: false,
        })
      } catch {
        previews = undefined
      }

      return resolveParams(params, previews)
    },
    [kind, queryClient, resolveParams],
  )
}
