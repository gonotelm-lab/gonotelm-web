import { describe, expect, it } from 'vitest'
import { buildInfoGraphicRequestParams, defaultInfoGraphicParameters } from './infoGraphicSettings'

describe('buildInfoGraphicRequestParams', () => {
  it('fills backend-required defaults when params are omitted', () => {
    expect(buildInfoGraphicRequestParams()).toEqual({
      orientation: 'landscape',
      text_language: 'zh-CN',
      detail_level: 'standard',
      visual_style: 'default',
    })
  })

  it('merges custom params and omits empty extra prompt', () => {
    expect(
      buildInfoGraphicRequestParams({
        orientation: 'landscape',
        text_language: 'en-US',
        detail_level: 'detailed',
        extra_prompt: '  focus on timeline  ',
      }),
    ).toEqual({
      orientation: 'landscape',
      text_language: 'en-US',
      detail_level: 'detailed',
      visual_style: 'default',
      extra_prompt: 'focus on timeline',
    })
  })

  it('keeps dialog defaults aligned with request defaults', () => {
    expect(defaultInfoGraphicParameters.orientation).toBe('landscape')
    expect(defaultInfoGraphicParameters.text_language).toBe('zh-CN')
    expect(defaultInfoGraphicParameters.detail_level).toBe('standard')
    expect(defaultInfoGraphicParameters.visual_style).toBe('default')
  })
})
