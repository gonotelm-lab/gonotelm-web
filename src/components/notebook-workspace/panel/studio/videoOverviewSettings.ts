import i18n from '@/i18n'
import { getDefaultStudioOutputLanguage } from '@/i18n/studioOutputLanguage'
import type {
  GenerateVideoOverviewParameters,
  ListStudioStylePreviewsResponse,
  StudioArtifactVideoOverviewVisualStyle,
} from '@/types/api'
import {
  buildStylePreviewOptionList,
  resolveStylePreviewValue,
  type StylePreviewOption,
} from './stylePreviewSettings'

/** `kind` query sent to GET /api/v1/artifacts/style-previews. */
export const VIDEO_OVERVIEW_STYLE_PREVIEW_KIND = 'video_overview'

export function getDefaultVideoOverviewParameters(): GenerateVideoOverviewParameters {
  return {
    language: getDefaultStudioOutputLanguage(),
    visual_style: 'default',
    tip: '',
  }
}

/** Snapshot defaults; language follows current UI locale at access time. */
export const defaultVideoOverviewParameters: GenerateVideoOverviewParameters =
  getDefaultVideoOverviewParameters()

export function buildVideoOverviewRequestParams(
  params?: GenerateVideoOverviewParameters,
): GenerateVideoOverviewParameters {
  const defaults = getDefaultVideoOverviewParameters()
  const normalized: GenerateVideoOverviewParameters = {
    language: params?.language?.trim() || defaults.language,
    visual_style: params?.visual_style || defaults.visual_style,
  }
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}

export function getVideoOverviewLanguageOptionList(): { value: string; label: string }[] {
  return [
    { value: 'zh-CN', label: i18n.t('studio:lang.zhCN') },
    { value: 'en-US', label: i18n.t('studio:lang.enUS') },
  ]
}

/**
 * Hardcoded fallback list: used when the style-preview endpoint errors or
 * returns no styles, so the dialog always offers a usable choice.
 */
export function getVideoOverviewVisualStyleOptionList(): StylePreviewOption[] {
  return [
    {
      value: 'default',
      label: i18n.t('studio:style.videoOverview.default.label'),
      description: i18n.t('studio:style.videoOverview.default.description'),
    },
    {
      value: 'educational',
      label: i18n.t('studio:style.videoOverview.educational.label'),
      description: i18n.t('studio:style.videoOverview.educational.description'),
    },
    {
      value: 'cute',
      label: i18n.t('studio:style.videoOverview.cute.label'),
      description: i18n.t('studio:style.videoOverview.cute.description'),
    },
  ]
}

/**
 * Backend list wins (order, membership, preview images); unknown styles keep the
 * raw value as label. Empty/absent response falls back to the hardcoded list.
 */
export function getVideoOverviewVisualStyleOptionListFromPreviews(
  response?: ListStudioStylePreviewsResponse | null,
): StylePreviewOption[] {
  return buildStylePreviewOptionList(response, getVideoOverviewVisualStyleOptionList())
}

/** Keeps the selection on a style the backend still lists, else backend default. */
export function resolveVideoOverviewVisualStyle(
  options: StylePreviewOption[],
  current?: string,
  backendDefault?: string,
): StudioArtifactVideoOverviewVisualStyle {
  return resolveStylePreviewValue(options, current, backendDefault) ?? 'default'
}

/**
 * Generate-time guard: whatever style was requested (dialog choice or the plain
 * tool-card click), submit only a style the backend lists — otherwise the
 * backend default, otherwise the hardcoded first option.
 */
export function resolveVideoOverviewParamsWithPreviews(
  params: GenerateVideoOverviewParameters,
  previews?: ListStudioStylePreviewsResponse | null,
): GenerateVideoOverviewParameters {
  const options = getVideoOverviewVisualStyleOptionListFromPreviews(previews)
  return {
    ...params,
    visual_style: resolveVideoOverviewVisualStyle(
      options,
      params.visual_style,
      previews?.default_visual_style,
    ),
  }
}
