import type {
  GenerateQuizParameters,
  StudioArtifactQuizCount,
  StudioArtifactQuizDifficulty,
} from '@/types/api'

export const defaultQuizParameters: GenerateQuizParameters = {
  count: 'default',
  difficulty: 'medium',
  tip: '',
}

export function buildQuizRequestParams(
  params?: GenerateQuizParameters,
): GenerateQuizParameters {
  const normalized: GenerateQuizParameters = {
    count: params?.count || defaultQuizParameters.count,
    difficulty: params?.difficulty || defaultQuizParameters.difficulty,
  }
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}

export const quizCountOptionList: {
  value: StudioArtifactQuizCount
  label: string
  description: string
}[] = [
  {
    value: 'few',
    label: '少',
    description: '优先覆盖核心概念与主线，题量精炼。',
  },
  {
    value: 'default',
    label: '默认',
    description: '在宏观主线与关键细节之间保持平衡。',
  },
  {
    value: 'many',
    label: '多',
    description: '多挖细节、对比、边界条件与易错点。',
  },
]

export const quizDifficultyOptionList: {
  value: StudioArtifactQuizDifficulty
  label: string
  description: string
}[] = [
  {
    value: 'easy',
    label: '简单',
    description: '通俗表述，侧重基础定义与直观理解。',
  },
  {
    value: 'medium',
    label: '中等',
    description: '兼顾定义理解与常见应用/原理。',
  },
  {
    value: 'hard',
    label: '困难',
    description: '可包含更深入机制、边界情况与对比辨析。',
  },
]
