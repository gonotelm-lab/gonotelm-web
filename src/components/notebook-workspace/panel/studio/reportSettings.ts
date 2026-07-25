import type {
  GenerateReportParameters,
  StudioArtifactReportStyle,
} from '@/types/api'

export const defaultReportParameters: GenerateReportParameters = {
  style: 'default',
  language: 'zh-CN',
  tip: '',
}

export function buildReportRequestParams(
  params?: GenerateReportParameters,
): GenerateReportParameters {
  const normalized: GenerateReportParameters = {
    style: params?.style || defaultReportParameters.style,
    language: params?.language?.trim() || defaultReportParameters.language,
  }
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}

export const reportLanguageOptionList: { value: string; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]

export const reportStyleOptionList: {
  value: StudioArtifactReportStyle
  label: string
  description: string
}[] = [
  {
    value: 'default',
    label: '默认',
    description: '证据驱动报告，结论先行，按主题聚合来源要点。',
  },
  {
    value: 'brief',
    label: '简报文档',
    description: '分析师式要点速读，提炼核心洞见与关键引文。',
  },
  {
    value: 'study-guide',
    label: '学习指南',
    description: '分层思考问题 + 术语词汇 + 自测清单，引导主动学习。',
  },
  {
    value: 'detailed',
    label: '深度解读',
    description: '融汇来源要点为叙事感长文，深入浅出，有层次有节奏。',
  },
]
