import { describe, expect, it } from 'vitest'
import { workspaceIconSize, workspaceType, workspaceTypeRem } from './typeTokens'

describe('workspace type tokens', () => {
  it('exposes modular text scale 12/14/16/18/20', () => {
    expect(workspaceType).toEqual({
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      mono: 14,
    })
  })

  it('exposes icon sizes without half-pixel drift', () => {
    expect(workspaceIconSize).toEqual({
      sm: 16,
      md: 18,
      lg: 20,
      xl: 32,
    })
  })

  it('keeps rem aliases aligned to the px scale', () => {
    expect(workspaceTypeRem.xs).toBe('0.75rem')
    expect(workspaceTypeRem.sm).toBe('0.875rem')
    expect(workspaceTypeRem.md).toBe('1rem')
    expect(workspaceTypeRem.lg).toBe('1.125rem')
    expect(workspaceTypeRem.xl).toBe('1.25rem')
  })
})
