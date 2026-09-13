import i18n from '@/i18n'
import { getDefaultStudioOutputLanguage } from '@/i18n/studioOutputLanguage'
import type {
  GenerateVideoOverviewParameters,
  StudioArtifactVideoOverviewVisualStyle,
} from '@/types/api'

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

export function getVideoOverviewVisualStyleOptionList(): {
  value: StudioArtifactVideoOverviewVisualStyle
  label: string
  description: string
}[] {
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
