import type {
  GenerateInfoGraphicParameters,
  StudioArtifactInfoGraphicDetailLevel,
  StudioArtifactInfoGraphicOrientation,
} from '@/types/api'

export const defaultInfoGraphicParameters: GenerateInfoGraphicParameters = {
  orientation: 'portrait',
  text_language: 'zh-cn(简体中文)',
  detail_level: 'standard',
  extra_prompt: '',
}

export function buildInfoGraphicRequestParams(
  params?: GenerateInfoGraphicParameters,
): GenerateInfoGraphicParameters {
  const normalized: GenerateInfoGraphicParameters = {
    orientation: params?.orientation || defaultInfoGraphicParameters.orientation,
    text_language: params?.text_language?.trim() || defaultInfoGraphicParameters.text_language,
    detail_level: params?.detail_level || defaultInfoGraphicParameters.detail_level,
  }
  const extraPrompt = params?.extra_prompt?.trim()
  if (extraPrompt) {
    normalized.extra_prompt = extraPrompt
  }
  return normalized
}

export const infoGraphicOrientationOptionList: {
  value: StudioArtifactInfoGraphicOrientation
  label: string
}[] = [
  { value: 'landscape', label: '横屏' },
  { value: 'portrait', label: '竖屏' },
  { value: 'square', label: '方图' },
]

export const infoGraphicLanguageOptionList: { value: string; label: string }[] = [
  { value: 'zh-cn(简体中文)', label: '简体中文' },
  { value: 'en(English)', label: 'English' },
  { value: 'zh-tw(繁体中文)', label: '繁体中文' },
  { value: 'ja(日本語)', label: '日本語' },
  { value: 'ko(한국어)', label: '한국어' },
]

export const infoGraphicDetailLevelOptionList: {
  value: StudioArtifactInfoGraphicDetailLevel
  label: string
  description: string
}[] = [
  {
    value: 'concise',
    label: '简略',
    description: '快速提炼核心信息',
  },
  {
    value: 'standard',
    label: '标准',
    description: '平衡覆盖与信息密度',
  },
  {
    value: 'detailed',
    label: '详细',
    description: '深入探索并补充边界条件',
  },
]
