import {
  INFO_GRAPHIC_STYLE_PREVIEW_KIND,
  resolveInfoGraphicParamsWithPreviews,
} from '../infoGraphicSettings'
import { useStudioVisualStyleResolver } from './useStudioVisualStyleResolver'

/** Confirms the supported info graphic styles with the backend before submitting. */
export function useInfoGraphicVisualStyleResolver() {
  return useStudioVisualStyleResolver(
    INFO_GRAPHIC_STYLE_PREVIEW_KIND,
    resolveInfoGraphicParamsWithPreviews,
  )
}
