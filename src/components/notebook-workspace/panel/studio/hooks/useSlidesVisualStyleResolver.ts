import { resolveSlidesParamsWithPreviews, SLIDES_STYLE_PREVIEW_KIND } from '../slidesSettings'
import { useStudioVisualStyleResolver } from './useStudioVisualStyleResolver'

/** Confirms the supported slides styles with the backend before submitting. */
export function useSlidesVisualStyleResolver() {
  return useStudioVisualStyleResolver(SLIDES_STYLE_PREVIEW_KIND, resolveSlidesParamsWithPreviews)
}
