import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import type { ListStudioStylePreviewsResponse } from '@/types/api'
import {
  buildSlidesRequestParams,
  getDefaultSlidesParameters,
  getSlidesVisualStyleOptionList,
  getSlidesVisualStyleOptionListFromPreviews,
  resolveSlidesParamsWithPreviews,
  resolveSlidesVisualStyle,
} from './slidesSettings'

describe('buildSlidesRequestParams', () => {
  it('always includes language and visual_style defaults', () => {
    const defaults = getDefaultSlidesParameters()
    expect(buildSlidesRequestParams()).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
    expect(buildSlidesRequestParams({ tip: '' })).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
    expect(buildSlidesRequestParams({ tip: '   ' })).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
  })

  it('trims tip before sending and keeps language / visual_style', () => {
    expect(
      buildSlidesRequestParams({
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
    const defaults = getDefaultSlidesParameters()
    expect(
      buildSlidesRequestParams({
        language: '  ',
        visual_style: undefined,
      }),
    ).toEqual({
      language: defaults.language,
      visual_style: 'default',
    })
  })

  it('keeps dialog defaults tip as empty string', () => {
    expect(getDefaultSlidesParameters()).toMatchObject({
      tip: '',
      visual_style: 'default',
    })
  })
})

describe('getSlidesVisualStyleOptionListFromPreviews', () => {
  const responseWith = (
    previews: { visual_style: string; preview_url: string }[],
    defaultVisualStyle = 'default',
  ): ListStudioStylePreviewsResponse => ({
    kind: 'slides',
    default_visual_style: defaultVisualStyle,
    previews,
  })

  it('falls back to the hardcoded list when the response is missing or empty', () => {
    const hardcoded = getSlidesVisualStyleOptionList()

    expect(getSlidesVisualStyleOptionListFromPreviews(undefined)).toEqual(hardcoded)
    expect(getSlidesVisualStyleOptionListFromPreviews(null)).toEqual(hardcoded)
    expect(getSlidesVisualStyleOptionListFromPreviews(responseWith([]))).toEqual(hardcoded)
  })

  it('keeps backend order, labels and preview urls', () => {
    const options = getSlidesVisualStyleOptionListFromPreviews(
      responseWith([
        { visual_style: 'default', preview_url: 'https://cdn.example.com/default.webp' },
        { visual_style: 'cute', preview_url: 'https://cdn.example.com/cute.webp' },
        { visual_style: 'educational', preview_url: 'https://cdn.example.com/edu.webp' },
      ]),
    )

    expect(options.map((option) => option.value)).toEqual(['default', 'cute', 'educational'])
    expect(options.map((option) => option.previewUrl)).toEqual([
      'https://cdn.example.com/default.webp',
      'https://cdn.example.com/cute.webp',
      'https://cdn.example.com/edu.webp',
    ])
    expect(options[1]).toMatchObject({
      label: i18n.t('studio:style.slides.cute.label'),
      description: i18n.t('studio:style.slides.cute.description'),
    })
  })

  it('drops empty preview urls and degrades unknown styles to their raw value', () => {
    const options = getSlidesVisualStyleOptionListFromPreviews(
      responseWith([
        { visual_style: 'default', preview_url: '' },
        { visual_style: 'brutalist', preview_url: 'https://cdn.example.com/brutalist.webp' },
      ]),
    )

    expect(options).toEqual([
      {
        value: 'default',
        label: i18n.t('studio:style.slides.default.label'),
        description: i18n.t('studio:style.slides.default.description'),
        previewUrl: undefined,
      },
      {
        value: 'brutalist',
        label: 'brutalist',
        description: '',
        previewUrl: 'https://cdn.example.com/brutalist.webp',
      },
    ])
  })
})

describe('resolveSlidesVisualStyle', () => {
  const options = getSlidesVisualStyleOptionList()

  it('keeps a still-listed selection', () => {
    expect(resolveSlidesVisualStyle(options, 'cute', 'default')).toBe('cute')
  })

  it('follows the backend default when the selection is gone', () => {
    const backendOptions = getSlidesVisualStyleOptionListFromPreviews({
      kind: 'slides',
      default_visual_style: 'cute',
      previews: [
        { visual_style: 'cute', preview_url: '' },
        { visual_style: 'default', preview_url: '' },
      ],
    })

    expect(resolveSlidesVisualStyle(backendOptions, 'educational', 'cute')).toBe('cute')
  })

  it('falls back to the first option when neither candidate is listed', () => {
    expect(resolveSlidesVisualStyle(options, 'brutalist', 'unknown')).toBe('default')
  })
})

describe('resolveSlidesParamsWithPreviews', () => {
  const params = {
    language: 'zh-CN',
    visual_style: 'default',
    tip: '突出结论',
  }

  it('keeps a requested style the backend still lists', () => {
    expect(
      resolveSlidesParamsWithPreviews(params, {
        kind: 'slides',
        default_visual_style: 'cute',
        previews: [
          { visual_style: 'default', preview_url: '' },
          { visual_style: 'cute', preview_url: '' },
        ],
      }),
    ).toEqual({ ...params, visual_style: 'default' })
  })

  it('uses the backend default when the requested style is gone', () => {
    expect(
      resolveSlidesParamsWithPreviews(
        { ...params, visual_style: 'legacy-style' },
        {
          kind: 'slides',
          default_visual_style: 'cute',
          previews: [
            { visual_style: 'cute', preview_url: '' },
            { visual_style: 'default', preview_url: '' },
          ],
        },
      ),
    ).toEqual({ ...params, visual_style: 'cute' })
  })

  it('keeps the requested style when the endpoint failed or returned nothing', () => {
    expect(resolveSlidesParamsWithPreviews(params, undefined)).toEqual(params)
    expect(resolveSlidesParamsWithPreviews(params, null)).toEqual(params)
    expect(
      resolveSlidesParamsWithPreviews(params, {
        kind: 'slides',
        default_visual_style: 'cute',
        previews: [],
      }),
    ).toEqual(params)
  })
})
