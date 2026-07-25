import type {
  GenerateAudioOverviewParameters,
  StudioArtifactAudioOverviewStyle,
} from '@/types/api'

export const defaultAudioOverviewParameters: GenerateAudioOverviewParameters = {
  language: 'zh-CN',
  style: 'abstract',
  tip: '',
}

export function buildAudioOverviewRequestParams(
  params?: GenerateAudioOverviewParameters,
): GenerateAudioOverviewParameters {
  const normalized: GenerateAudioOverviewParameters = {
    language: params?.language?.trim() || defaultAudioOverviewParameters.language,
    style: params?.style || defaultAudioOverviewParameters.style,
  }
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}

export const audioOverviewLanguageOptionList: { value: string; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]

export const audioOverviewStyleOptionList: {
  value: StudioArtifactAudioOverviewStyle
  label: string
  description: string
}[] = [
  {
    value: 'abstract',
    label: '摘要',
    description: '快速提炼核心观点，适合先看全貌。',
  },
  {
    value: 'deep-research',
    label: '深度研究',
    description: '深入展开背景与细节，信息更完整。',
  },
  {
    value: 'discussion',
    label: '讨论',
    description: '以对谈方式串联观点，节奏更自然。',
  },
  {
    value: 'debate',
    label: '辩论',
    description: '强调观点碰撞，适合展示不同立场。',
  },
]
