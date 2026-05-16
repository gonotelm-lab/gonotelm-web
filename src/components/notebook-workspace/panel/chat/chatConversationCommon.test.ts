import { describe, expect, it } from 'vitest'
import {
  getFinishReasonNotice,
  mergeDistinctCitationDetails,
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
        docs: [{ id: 'doc-1' }, { id: 'doc-2' }],
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
