import i18n from '@/i18n'
import { getDefaultStudioOutputLanguage } from '@/i18n/studioOutputLanguage'
import type {
  GenerateInfoGraphicParameters,
  ListStudioStylePreviewsResponse,
  StudioArtifactInfoGraphicDetailLevel,
  StudioArtifactInfoGraphicOrientation,
  StudioArtifactInfoGraphicVisualStyle,
} from '@/types/api'
import {
  buildStylePreviewOptionList,
  resolveStylePreviewValue,
  type StylePreviewOption,
} from './stylePreviewSettings'

/** `kind` query sent to GET /api/v1/artifacts/style-previews. */
export const INFO_GRAPHIC_STYLE_PREVIEW_KIND = 'info_graphic'

export function getDefaultInfoGraphicParameters(): GenerateInfoGraphicParameters {
  return {
    orientation: 'landscape',
    text_language: getDefaultStudioOutputLanguage(),
    detail_level: 'standard',
    visual_style: 'default',
    extra_prompt: '',
  }
}

/** Snapshot defaults; text_language follows current UI locale at access time. */
export const defaultInfoGraphicParameters: GenerateInfoGraphicParameters =
  getDefaultInfoGraphicParameters()

export function buildInfoGraphicRequestParams(
  params?: GenerateInfoGraphicParameters,
): GenerateInfoGraphicParameters {
  const defaults = getDefaultInfoGraphicParameters()
  const normalized: GenerateInfoGraphicParameters = {
    orientation: params?.orientation || defaults.orientation,
    text_language: params?.text_language?.trim() || defaults.text_language,
    detail_level: params?.detail_level || defaults.detail_level,
    visual_style: params?.visual_style || defaults.visual_style,
  }
  const extraPrompt = params?.extra_prompt?.trim()
  if (extraPrompt) {
    normalized.extra_prompt = extraPrompt
  }
  return normalized
}

export function getInfoGraphicOrientationOptionList(): {
  value: StudioArtifactInfoGraphicOrientation
  label: string
}[] {
  return [
    { value: 'landscape', label: i18n.t('studio:infoGraphic.orientation.landscape') },
    { value: 'portrait', label: i18n.t('studio:infoGraphic.orientation.portrait') },
    { value: 'square', label: i18n.t('studio:infoGraphic.orientation.square') },
  ]
}

export function getInfoGraphicLanguageOptionList(): { value: string; label: string }[] {
  return [
    { value: 'zh-CN', label: i18n.t('studio:lang.zhCN') },
    { value: 'en-US', label: i18n.t('studio:lang.enUS') },
  ]
}

export function getInfoGraphicDetailLevelOptionList(): {
  value: StudioArtifactInfoGraphicDetailLevel
  label: string
  description: string
}[] {
  return [
    {
      value: 'concise',
      label: i18n.t('studio:infoGraphic.detail.concise.label'),
      description: i18n.t('studio:infoGraphic.detail.concise.description'),
    },
    {
      value: 'standard',
      label: i18n.t('studio:infoGraphic.detail.standard.label'),
      description: i18n.t('studio:infoGraphic.detail.standard.description'),
    },
    {
      value: 'detailed',
      label: i18n.t('studio:infoGraphic.detail.detailed.label'),
      description: i18n.t('studio:infoGraphic.detail.detailed.description'),
    },
  ]
}

export function getInfoGraphicVisualStyleOptionList(): StylePreviewOption[] {
  return [
    {
      value: 'default',
      label: i18n.t('studio:infoGraphic.visual.default.label'),
      description: i18n.t('studio:infoGraphic.visual.default.description'),
    },
    {
      value: 'hand-drawn',
      label: i18n.t('studio:infoGraphic.visual.handDrawn.label'),
      description: i18n.t('studio:infoGraphic.visual.handDrawn.description'),
    },
    {
      value: 'anime',
      label: i18n.t('studio:infoGraphic.visual.anime.label'),
      description: i18n.t('studio:infoGraphic.visual.anime.description'),
    },
    {
      value: 'cute',
      label: i18n.t('studio:infoGraphic.visual.cute.label'),
      description: i18n.t('studio:infoGraphic.visual.cute.description'),
    },
    {
      value: 'educational',
      label: i18n.t('studio:infoGraphic.visual.educational.label'),
      description: i18n.t('studio:infoGraphic.visual.educational.description'),
    },
    {
      value: 'minimal-2.5d',
      label: i18n.t('studio:infoGraphic.visual.minimal25d.label'),
      description: i18n.t('studio:infoGraphic.visual.minimal25d.description'),
    },
  ]
}

/**
 * Backend list wins (order, membership, preview images); unknown styles keep the
 * raw value as label. Empty/absent response falls back to the hardcoded list.
 */
export function getInfoGraphicVisualStyleOptionListFromPreviews(
  response?: ListStudioStylePreviewsResponse | null,
): StylePreviewOption[] {
  return buildStylePreviewOptionList(response, getInfoGraphicVisualStyleOptionList())
}

/** Keeps the selection on a style the backend still lists, else backend default. */
export function resolveInfoGraphicVisualStyle(
  options: StylePreviewOption[],
  current?: string,
  backendDefault?: string,
): StudioArtifactInfoGraphicVisualStyle {
  return resolveStylePreviewValue(options, current, backendDefault) ?? 'default'
}

/**
 * Generate-time guard: whatever style was requested (dialog choice or the plain
 * tool-card click), submit only a style the backend lists — otherwise the
 * backend default, otherwise the hardcoded first option.
 */
export function resolveInfoGraphicParamsWithPreviews(
  params: GenerateInfoGraphicParameters,
  previews?: ListStudioStylePreviewsResponse | null,
): GenerateInfoGraphicParameters {
  const options = getInfoGraphicVisualStyleOptionListFromPreviews(previews)
  return {
    ...params,
    visual_style: resolveInfoGraphicVisualStyle(
      options,
      params.visual_style,
      previews?.default_visual_style,
    ),
  }
}
