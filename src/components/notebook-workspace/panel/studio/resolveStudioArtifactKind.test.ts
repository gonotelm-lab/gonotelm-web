import { describe, expect, it } from 'vitest'
import {
  resolveStudioArtifactActionId,
  resolveStudioArtifactFallbackTitle,
  resolveStudioArtifactKind,
} from './resolveStudioArtifactKind'

describe('resolveStudioArtifactKind', () => {
  it('maps data_table', () => {
    expect(resolveStudioArtifactKind('data_table')).toBe('data_table')
  })

  it('does not map unknown kinds to mindmap', () => {
    expect(resolveStudioArtifactKind('unknown-kind')).toBe('report')
    expect(resolveStudioArtifactKind('mindmap')).toBe('mindmap')
  })
})

describe('resolveStudioArtifactActionId', () => {
  it('resolves data_table action id', () => {
    expect(resolveStudioArtifactActionId('data_table')).toBe('generate-data_table')
  })
})

describe('resolveStudioArtifactFallbackTitle', () => {
  it('resolves data_table title', () => {
    expect(resolveStudioArtifactFallbackTitle('data_table')).toBe('数据表')
  })

  it('resolves note title', () => {
    expect(resolveStudioArtifactFallbackTitle('note')).toBe('笔记')
  })
})

describe('resolveStudioArtifactKind note', () => {
  it('maps note kind', () => {
    expect(resolveStudioArtifactKind('note')).toBe('note')
    expect(resolveStudioArtifactActionId('note')).toBe('save-as-note')
  })
})
