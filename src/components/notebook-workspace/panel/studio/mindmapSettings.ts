import type { GenerateMindmapParameters } from '@/types/api'

export const defaultMindmapParameters: GenerateMindmapParameters = {
  tip: '',
}

export function buildMindmapRequestParams(
  params?: GenerateMindmapParameters,
): GenerateMindmapParameters {
  const normalized: GenerateMindmapParameters = {}
  const tip = params?.tip?.trim()
  if (tip) {
    normalized.tip = tip
  }
  return normalized
}
