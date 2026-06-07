import { describe, expect, it } from 'vitest'
import {
  canShowCitationJumpButton,
  formatCitationPositionText,
  getFinishReasonNotice,
  mergeDistinctCitationDetails,
  normalizeCitationPosition,
  resolveCitationTypeLabel,
  resolveStreamContentAction,
  toCitationDetailsFromStreamCitation,
} from './chatConversationCommon'

describe('resolveStreamContentAction', () => {
  it('returns override only for override action', () => {
    expect(resolveStreamContentAction('override')).toBe('override')
    expect(resolveStreamContentAction('continue')).toBe('continue')
    expect(resolveStreamContentAction('unknown')).toBe('continue')
    expect(resolveStreamContentAction(undefined)).toBe('continue')
  })
})

describe('getFinishReasonNotice', () => {
  it('maps known finish reasons', () => {
    expect(getFinishReasonNotice('length')).toContain('长度上限')
    expect(getFinishReasonNotice('content_filter')).toContain('内容安全过滤')
    expect(getFinishReasonNotice('stop')).toBe('')
  })
})

describe('toCitationDetailsFromStreamCitation', () => {
  it('converts stream citation docs into ui markers', () => {
    const citation = [
      {
        source_id: 'source-1',
        docs: [
          { id: 'doc-1', is_summary: true, position: { start: 0, end: 0 } },
          { id: 'doc-2', is_summary: false, position: { start: 12, end: 34 } },
        ],
      },
    ]

    const result = toCitationDetailsFromStreamCitation(citation)

    expect(result).toEqual([
      {
        marker: '[[0#0]]',
        sourceIndex: 0,
        docIndex: 0,
        sourceId: 'source-1',
        docId: 'doc-1',
        isSummary: true,
        position: { start: 0, end: 0 },
      },
      {
        marker: '[[0#1]]',
        sourceIndex: 0,
        docIndex: 1,
        sourceId: 'source-1',
        docId: 'doc-2',
        isSummary: false,
        position: { start: 12, end: 34 },
      },
    ])
  })
})

describe('citation metadata helpers', () => {
  it('normalizes source-doc position from snake_case keys', () => {
    expect(normalizeCitationPosition({ start: 1, end: 9 })).toEqual({ start: 1, end: 9 })
  })

  it('normalizes byte range metadata when provided', () => {
    expect(
      normalizeCitationPosition({ start: 3, end: 11, bytes_start: 12, bytes_end: 32 }),
    ).toEqual({
      start: 3,
      end: 11,
      bytesStart: 12,
      bytesEnd: 32,
    })
  })

  it('formats summary zero-span as non-locatable text', () => {
    expect(formatCitationPositionText({ start: 0, end: 0 }, true)).toBe('无原文定位（总结性引用）')
  })

  it('formats regular position range text', () => {
    expect(formatCitationPositionText({ start: 8, end: 20 }, false)).toBe('8 - 20')
  })

  it('returns fallback text when position missing', () => {
    expect(formatCitationPositionText(undefined, false)).toBe('-')
  })

  it('maps summary label from boolean', () => {
    expect(resolveCitationTypeLabel(true)).toBe('总结性引用')
    expect(resolveCitationTypeLabel(false)).toBe('原文片段引用')
  })

  it('hides citation jump button when position is missing', () => {
    expect(
      canShowCitationJumpButton({
        onOpenCitationJump: () => undefined,
        sourceId: 'source-1',
        position: null,
        isOriginalCitation: true,
      }),
    ).toBe(false)
  })

  it('shows citation jump button when source and position are available', () => {
    expect(
      canShowCitationJumpButton({
        onOpenCitationJump: () => undefined,
        sourceId: 'source-1',
        position: { start: 11, end: 28 },
        isOriginalCitation: true,
      }),
    ).toBe(true)
  })
})

describe('mergeDistinctCitationDetails', () => {
  it('deduplicates by marker and keeps newest values', () => {
    const current = [
      {
        marker: '[[0#0]]',
        sourceIndex: 0,
        docIndex: 0,
        sourceId: 'source-1',
        docId: 'doc-1-old',
      },
    ]
    const incoming = [
      {
        marker: '[[0#0]]',
        sourceIndex: 0,
        docIndex: 0,
        sourceId: 'source-1',
        docId: 'doc-1-new',
      },
      {
        marker: '[[0#1]]',
        sourceIndex: 0,
        docIndex: 1,
        sourceId: 'source-1',
        docId: 'doc-2',
      },
    ]

    const result = mergeDistinctCitationDetails(current, incoming)

    expect(result).toEqual([
      {
        marker: '[[0#0]]',
        sourceIndex: 0,
        docIndex: 0,
        sourceId: 'source-1',
        docId: 'doc-1-new',
      },
      {
        marker: '[[0#1]]',
        sourceIndex: 0,
        docIndex: 1,
        sourceId: 'source-1',
        docId: 'doc-2',
      },
    ])
  })
})
