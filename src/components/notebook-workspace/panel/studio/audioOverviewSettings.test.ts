import { describe, expect, it } from 'vitest'
import {
  buildAudioOverviewRequestParams,
  defaultAudioOverviewParameters,
} from './audioOverviewSettings'

describe('buildAudioOverviewRequestParams', () => {
  it('fills backend-required defaults when params are omitted', () => {
    expect(buildAudioOverviewRequestParams()).toEqual({
      language: 'zh-cn(简体中文)',
      style: 'abstract',
    })
  })

  it('merges custom params and omits empty tip', () => {
    expect(
      buildAudioOverviewRequestParams({
        language: ' en(English) ',
        style: 'discussion',
        tip: '  keep concise  ',
      }),
    ).toEqual({
      language: 'en(English)',
      style: 'discussion',
      tip: 'keep concise',
    })
  })

  it('keeps dialog defaults aligned with request defaults', () => {
    expect(defaultAudioOverviewParameters.language).toBe('zh-cn(简体中文)')
    expect(defaultAudioOverviewParameters.style).toBe('abstract')
  })
})
