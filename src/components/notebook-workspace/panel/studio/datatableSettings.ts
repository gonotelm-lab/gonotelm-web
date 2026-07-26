import type { GenerateDataTableParameters } from '@/types/api'

export const defaultDataTableParameters: GenerateDataTableParameters = {
  tip: '',
}

export function buildDataTableRequestParams(
  params?: GenerateDataTableParameters,
): GenerateDataTableParameters {
  const normalized: GenerateDataTableParameters = {}
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}
