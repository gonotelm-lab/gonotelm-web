import type {
  GenerateInfoGraphicParameters,
  StudioArtifactInfoGraphicDetailLevel,
  StudioArtifactInfoGraphicOrientation,
  StudioArtifactInfoGraphicVisualStyle,
} from '@/types/api'

export const defaultInfoGraphicParameters: GenerateInfoGraphicParameters = {
  orientation: 'landscape',
  text_language: 'zh-CN',
  detail_level: 'standard',
  visual_style: 'default',
  extra_prompt: '',
}

export function buildInfoGraphicRequestParams(
  params?: GenerateInfoGraphicParameters,
): GenerateInfoGraphicParameters {
  const normalized: GenerateInfoGraphicParameters = {
    orientation: params?.orientation || defaultInfoGraphicParameters.orientation,
    text_language: params?.text_language?.trim() || defaultInfoGraphicParameters.text_language,
    detail_level: params?.detail_level || defaultInfoGraphicParameters.detail_level,
    visual_style: params?.visual_style || defaultInfoGraphicParameters.visual_style,
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
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
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

export const infoGraphicVisualStyleOptionList: {
  value: StudioArtifactInfoGraphicVisualStyle
  label: string
  description: string
}[] = [
  {
    value: 'default',
    label: '默认',
    description: '扁平化手绘插画，暖色调纸张质感。',
  },
  {
    value: 'hand-drawn',
    label: '手绘',
    description: '水彩笔触与晕染色彩，速写本气质。',
  },
  {
    value: 'anime',
    label: '动漫',
    description: '日系动漫线条与明快配色，数码质感。',
  },
  {
    value: 'cute',
    label: '可爱',
    description: '萌系Q版插画，粉嫩配色与装饰元素。',
  },
  {
    value: 'educational',
    label: '教学科普',
    description: '教科书插画风格，高对比度便于阅读。',
  },
  {
    value: 'minimal-2.5d',
    label: '极简2.5D',
    description: '等距视角几何构图，柔和渐变与投影。',
  },
]
