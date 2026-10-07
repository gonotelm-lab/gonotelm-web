import type { ListStudioStylePreviewsResponse } from '@/types/api'

/** One pickable visual style, already localized and paired with preview art. */
export interface StylePreviewOption {
  value: string
  label: string
  description?: string
  /** Absent when the backend has no seeded image for the style. */
  previewUrl?: string
}

/**
 * Backend list wins (order, membership, preview images); unknown styles keep the
 * raw value as label. Empty/absent response falls back to the hardcoded list.
 */
export function buildStylePreviewOptionList(
  previews: ListStudioStylePreviewsResponse | null | undefined,
  fallbackOptions: StylePreviewOption[],
): StylePreviewOption[] {
  const items = previews?.previews ?? []
  if (items.length === 0) {
    return fallbackOptions
  }

  return items.map((preview) => {
    const known = fallbackOptions.find((option) => option.value === preview.visual_style)
    return {
      value: preview.visual_style,
      label: known?.label ?? preview.visual_style,
      description: known?.description ?? '',
      previewUrl: preview.preview_url || undefined,
    }
  })
}

/** Keeps the selection on a style the backend still lists, else backend default, else the first option. */
export function resolveStylePreviewValue(
  options: StylePreviewOption[],
  current?: string,
  backendDefault?: string,
): string | undefined {
  const isListed = (candidate?: string) =>
    candidate !== undefined && options.some((option) => option.value === candidate)

  if (isListed(current)) {
    return current
  }
  if (isListed(backendDefault)) {
    return backendDefault
  }
  return options[0]?.value
}
