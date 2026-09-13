import { describe, expect, it } from 'vitest'
import {
  buildVideoOverviewRequestParams,
  getDefaultVideoOverviewParameters,
} from './videoOverviewSettings'

describe('buildVideoOverviewRequestParams', () => {
  it('always includes language and visual_style defaults', () => {
    const defaults = getDefaultVideoOverviewParameters()
    expect(buildVideoOverviewRequestParams()).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
    expect(buildVideoOverviewRequestParams({ tip: '' })).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
    expect(buildVideoOverviewRequestParams({ tip: '   ' })).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
  })

  it('trims tip before sending and keeps language / visual_style', () => {
    expect(
      buildVideoOverviewRequestParams({
        tip: '  focus on takeaways  ',
        language: 'en-US',
        visual_style: 'educational',
      }),
    ).toEqual({
      tip: 'focus on takeaways',
      language: 'en-US',
      visual_style: 'educational',
    })
  })

  it('falls back to defaults when language / visual_style are blank', () => {
    const defaults = getDefaultVideoOverviewParameters()
    expect(
      buildVideoOverviewRequestParams({
        language: '  ',
        visual_style: undefined,
      }),
    ).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
  })

  it('keeps dialog defaults tip as empty string', () => {
    expect(getDefaultVideoOverviewParameters()).toMatchObject({
      tip: '',
      visual_style: 'default',
    })
  })
})
