import { afterEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import type { ListStudioStylePreviewsResponse } from '@/types/api'
import {
  buildInfoGraphicRequestParams,
  getDefaultInfoGraphicParameters,
  getInfoGraphicVisualStyleOptionList,
  getInfoGraphicVisualStyleOptionListFromPreviews,
  resolveInfoGraphicParamsWithPreviews,
  resolveInfoGraphicVisualStyle,
} from './infoGraphicSettings'

describe('buildInfoGraphicRequestParams', () => {
  afterEach(async () => {
    await i18n.changeLanguage('zh')
  })

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
    const defaults = getDefaultInfoGraphicParameters()
    expect(defaults.orientation).toBe('landscape')
    expect(defaults.text_language).toBe('zh-CN')
    expect(defaults.detail_level).toBe('standard')
    expect(defaults.visual_style).toBe('default')
  })

  it('follows UI locale for default text_language', async () => {
    await i18n.changeLanguage('en')
    expect(getDefaultInfoGraphicParameters().text_language).toBe('en-US')
    expect(buildInfoGraphicRequestParams().text_language).toBe('en-US')
  })
})

describe('getInfoGraphicVisualStyleOptionListFromPreviews', () => {
  const responseWith = (
    previews: { visual_style: string; preview_url: string }[],
    defaultVisualStyle = 'default',
  ): ListStudioStylePreviewsResponse => ({
    kind: 'info_graphic',
    default_visual_style: defaultVisualStyle,
    previews,
  })

  it('falls back to the hardcoded list when the response is missing or empty', () => {
    const hardcoded = getInfoGraphicVisualStyleOptionList()

    expect(hardcoded.map((option) => option.value)).toEqual([
      'default',
      'hand-drawn',
      'anime',
      'cute',
      'educational',
      'minimal-2.5d',
    ])
    expect(getInfoGraphicVisualStyleOptionListFromPreviews(undefined)).toEqual(hardcoded)
    expect(getInfoGraphicVisualStyleOptionListFromPreviews(null)).toEqual(hardcoded)
    expect(getInfoGraphicVisualStyleOptionListFromPreviews(responseWith([]))).toEqual(hardcoded)
  })

  it('keeps backend order, labels and preview urls', () => {
    const options = getInfoGraphicVisualStyleOptionListFromPreviews(
      responseWith([
        { visual_style: 'hand-drawn', preview_url: 'https://cdn.example.com/hand-drawn.webp' },
        { visual_style: 'default', preview_url: 'https://cdn.example.com/default.webp' },
      ]),
    )

    expect(options.map((option) => option.value)).toEqual(['hand-drawn', 'default'])
    expect(options.map((option) => option.previewUrl)).toEqual([
      'https://cdn.example.com/hand-drawn.webp',
      'https://cdn.example.com/default.webp',
    ])
    expect(options[0]).toMatchObject({
      label: i18n.t('studio:infoGraphic.visual.handDrawn.label'),
      description: i18n.t('studio:infoGraphic.visual.handDrawn.description'),
    })
  })

  it('drops empty preview urls and degrades unknown styles to their raw value', () => {
    const options = getInfoGraphicVisualStyleOptionListFromPreviews(
      responseWith([
        { visual_style: 'manga', preview_url: 'https://cdn.example.com/manga.webp' },
        { visual_style: 'default', preview_url: '' },
      ]),
    )

    expect(options).toEqual([
      {
        value: 'manga',
        label: 'manga',
        description: '',
        previewUrl: 'https://cdn.example.com/manga.webp',
      },
      {
        value: 'default',
        label: i18n.t('studio:infoGraphic.visual.default.label'),
        description: i18n.t('studio:infoGraphic.visual.default.description'),
        previewUrl: undefined,
      },
    ])
  })
})

describe('resolveInfoGraphicVisualStyle', () => {
  const options = getInfoGraphicVisualStyleOptionList()

  it('keeps a still-listed selection', () => {
    expect(resolveInfoGraphicVisualStyle(options, 'anime', 'default')).toBe('anime')
  })

  it('follows the backend default when the selection is gone', () => {
    const backendOptions = getInfoGraphicVisualStyleOptionListFromPreviews({
      kind: 'info_graphic',
      default_visual_style: 'hand-drawn',
      previews: [
        { visual_style: 'hand-drawn', preview_url: '' },
        { visual_style: 'default', preview_url: '' },
      ],
    })

    expect(resolveInfoGraphicVisualStyle(backendOptions, 'legacy-style', 'hand-drawn')).toBe(
      'hand-drawn',
    )
  })

  it('falls back to the first option when neither candidate is listed', () => {
    expect(resolveInfoGraphicVisualStyle(options, 'legacy-style', 'unknown')).toBe('default')
  })
})

describe('resolveInfoGraphicParamsWithPreviews', () => {
  const params = {
    orientation: 'landscape' as const,
    text_language: 'zh-CN',
    detail_level: 'standard' as const,
    visual_style: 'default',
    extra_prompt: '突出结论',
  }

  it('keeps a requested style the backend still lists', () => {
    expect(
      resolveInfoGraphicParamsWithPreviews(params, {
        kind: 'info_graphic',
        default_visual_style: 'anime',
        previews: [
          { visual_style: 'default', preview_url: '' },
          { visual_style: 'anime', preview_url: '' },
        ],
      }),
    ).toEqual({ ...params, visual_style: 'default' })
  })

  it('uses the backend default when the requested style is gone', () => {
    expect(
      resolveInfoGraphicParamsWithPreviews(
        { ...params, visual_style: 'legacy-style' },
        {
          kind: 'info_graphic',
          default_visual_style: 'anime',
          previews: [
            { visual_style: 'anime', preview_url: '' },
            { visual_style: 'default', preview_url: '' },
          ],
        },
      ),
    ).toEqual({ ...params, visual_style: 'anime' })
  })

  it('keeps the requested style when the endpoint failed or returned nothing', () => {
    expect(resolveInfoGraphicParamsWithPreviews(params, undefined)).toEqual(params)
    expect(resolveInfoGraphicParamsWithPreviews(params, null)).toEqual(params)
    expect(
      resolveInfoGraphicParamsWithPreviews(params, {
        kind: 'info_graphic',
        default_visual_style: 'anime',
        previews: [],
      }),
    ).toEqual(params)
  })
})
