import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import type { ListStudioStylePreviewsResponse } from '@/types/api'
import {
  buildVideoOverviewRequestParams,
  getDefaultVideoOverviewParameters,
  getVideoOverviewVisualStyleOptionList,
  getVideoOverviewVisualStyleOptionListFromPreviews,
  resolveVideoOverviewParamsWithPreviews,
  resolveVideoOverviewVisualStyle,
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

describe('getVideoOverviewVisualStyleOptionListFromPreviews', () => {
  const responseWith = (
    previews: { visual_style: string; preview_url: string }[],
    defaultVisualStyle = 'default',
  ): ListStudioStylePreviewsResponse => ({
    kind: 'video_overview',
    default_visual_style: defaultVisualStyle,
    previews,
  })

  it('falls back to the hardcoded list when the response is missing or empty', () => {
    const hardcoded = getVideoOverviewVisualStyleOptionList()

    expect(hardcoded.map((option) => option.value)).toEqual(['default', 'educational', 'cute'])
    expect(getVideoOverviewVisualStyleOptionListFromPreviews(undefined)).toEqual(hardcoded)
    expect(getVideoOverviewVisualStyleOptionListFromPreviews(null)).toEqual(hardcoded)
    expect(getVideoOverviewVisualStyleOptionListFromPreviews(responseWith([]))).toEqual(hardcoded)
  })

  it('keeps backend order, labels and preview urls', () => {
    const options = getVideoOverviewVisualStyleOptionListFromPreviews(
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
      label: i18n.t('studio:style.videoOverview.cute.label'),
      description: i18n.t('studio:style.videoOverview.cute.description'),
    })
  })

  it('drops empty preview urls and degrades unknown styles to their raw value', () => {
    const options = getVideoOverviewVisualStyleOptionListFromPreviews(
      responseWith([
        { visual_style: 'default', preview_url: '' },
        { visual_style: 'cinematic', preview_url: 'https://cdn.example.com/cinematic.webp' },
      ]),
    )

    expect(options).toEqual([
      {
        value: 'default',
        label: i18n.t('studio:style.videoOverview.default.label'),
        description: i18n.t('studio:style.videoOverview.default.description'),
        previewUrl: undefined,
      },
      {
        value: 'cinematic',
        label: 'cinematic',
        description: '',
        previewUrl: 'https://cdn.example.com/cinematic.webp',
      },
    ])
  })
})

describe('resolveVideoOverviewVisualStyle', () => {
  const options = getVideoOverviewVisualStyleOptionList()

  it('keeps a still-listed selection', () => {
    expect(resolveVideoOverviewVisualStyle(options, 'cute', 'default')).toBe('cute')
  })

  it('follows the backend default when the selection is gone', () => {
    const backendOptions = getVideoOverviewVisualStyleOptionListFromPreviews({
      kind: 'video_overview',
      default_visual_style: 'cute',
      previews: [
        { visual_style: 'cute', preview_url: '' },
        { visual_style: 'default', preview_url: '' },
      ],
    })

    expect(resolveVideoOverviewVisualStyle(backendOptions, 'legacy-style', 'cute')).toBe('cute')
  })

  it('falls back to the first option when neither candidate is listed', () => {
    expect(resolveVideoOverviewVisualStyle(options, 'legacy-style', 'unknown')).toBe('default')
  })
})

describe('resolveVideoOverviewParamsWithPreviews', () => {
  const params = {
    language: 'zh-CN',
    visual_style: 'default',
    tip: '突出结论',
  }

  it('keeps a requested style the backend still lists', () => {
    expect(
      resolveVideoOverviewParamsWithPreviews(params, {
        kind: 'video_overview',
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
      resolveVideoOverviewParamsWithPreviews(
        { ...params, visual_style: 'legacy-style' },
        {
          kind: 'video_overview',
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
    expect(resolveVideoOverviewParamsWithPreviews(params, undefined)).toEqual(params)
    expect(resolveVideoOverviewParamsWithPreviews(params, null)).toEqual(params)
    expect(
      resolveVideoOverviewParamsWithPreviews(params, {
        kind: 'video_overview',
        default_visual_style: 'cute',
        previews: [],
      }),
    ).toEqual(params)
  })
})
