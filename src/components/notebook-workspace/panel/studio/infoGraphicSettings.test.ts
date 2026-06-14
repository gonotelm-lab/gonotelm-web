import { describe, expect, it } from 'vitest'
import { buildInfoGraphicRequestParams, defaultInfoGraphicParameters } from './infoGraphicSettings'

describe('buildInfoGraphicRequestParams', () => {
  it('fills backend-required defaults when params are omitted', () => {
    expect(buildInfoGraphicRequestParams()).toEqual({
      orientation: 'landscape',
      text_language: 'zh-cn(简体中文)',
      detail_level: 'standard',
    })
  })

  it('merges custom params and omits empty extra prompt', () => {
    expect(
      buildInfoGraphicRequestParams({
        orientation: 'landscape',
        text_language: 'en(English)',
        detail_level: 'detailed',
        extra_prompt: '  focus on timeline  ',
      }),
    ).toEqual({
      orientation: 'landscape',
      text_language: 'en(English)',
      detail_level: 'detailed',
      extra_prompt: 'focus on timeline',
    })
  })

  it('keeps dialog defaults aligned with request defaults', () => {
    expect(defaultInfoGraphicParameters.orientation).toBe('landscape')
    expect(defaultInfoGraphicParameters.text_language).toBe('zh-cn(简体中文)')
    expect(defaultInfoGraphicParameters.detail_level).toBe('standard')
  })
})
