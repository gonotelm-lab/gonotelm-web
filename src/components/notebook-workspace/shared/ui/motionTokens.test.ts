import { describe, expect, it } from 'vitest'
import { workspaceInteraction, workspaceTransitionPresets } from './motionTokens'

describe('workspace interaction tokens', () => {
  it('defaults hover to no transform and exposes reduced-motion query', () => {
    expect(workspaceInteraction.cursorPointer).toBe('pointer')
    expect(workspaceInteraction.hoverTransformNone).toBe('none')
    expect(workspaceInteraction.reducedMotionQuery).toBe(
      '@media (prefers-reduced-motion: reduce)',
    )
  })

  it('provides transform-free interactive transition preset', () => {
    expect(workspaceTransitionPresets.interactiveColorBorder).toContain('background-color')
    expect(workspaceTransitionPresets.interactiveColorBorder).toContain('border-color')
    expect(workspaceTransitionPresets.interactiveColorBorder).not.toContain('transform')
  })
})
