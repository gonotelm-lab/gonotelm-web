import {
  resolveVideoOverviewParamsWithPreviews,
  VIDEO_OVERVIEW_STYLE_PREVIEW_KIND,
} from '../videoOverviewSettings'
import { useStudioVisualStyleResolver } from './useStudioVisualStyleResolver'

/** Confirms the supported video overview styles with the backend before submitting. */
export function useVideoOverviewVisualStyleResolver() {
  return useStudioVisualStyleResolver(
    VIDEO_OVERVIEW_STYLE_PREVIEW_KIND,
    resolveVideoOverviewParamsWithPreviews,
  )
}
