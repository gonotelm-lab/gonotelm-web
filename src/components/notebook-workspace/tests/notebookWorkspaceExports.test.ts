import { describe, expect, it } from 'vitest'
import {
  ChatPanel,
  SourceSelectionController,
  SourcesPanel,
  StudioPanel,
  WorkspaceHeader,
} from '../index'

describe('notebook workspace entry exports', () => {
  it('exposes panel and layout components from unified entry', () => {
    expect(typeof ChatPanel).toBe('function')
    expect(typeof SourcesPanel).toBe('function')
    expect(typeof SourceSelectionController).toBe('function')
    expect(typeof StudioPanel).toBe('function')
    expect(typeof WorkspaceHeader).toBe('function')
  })
})
