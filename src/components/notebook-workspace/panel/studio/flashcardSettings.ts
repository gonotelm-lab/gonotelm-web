import type {
  GenerateFlashcardParameters,
  StudioArtifactFlashcardCount,
  StudioArtifactFlashcardDifficulty,
} from '@/types/api'

export const defaultFlashcardParameters: GenerateFlashcardParameters = {
  count: 'default',
  difficulty: 'medium',
  tip: '',
}

export function buildFlashcardRequestParams(
  params?: GenerateFlashcardParameters,
): GenerateFlashcardParameters {
  const normalized: GenerateFlashcardParameters = {
    count: params?.count || defaultFlashcardParameters.count,
    difficulty: params?.difficulty || defaultFlashcardParameters.difficulty,
  }
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}

export const flashcardCountOptionList: {
  value: StudioArtifactFlashcardCount
  label: string
  description: string
}[] = [
  {
    value: 'few',
    label: '少',
    description: '偏宏观概括，覆盖核心概念与主线。',
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

export const flashcardDifficultyOptionList: {
  value: StudioArtifactFlashcardDifficulty
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
