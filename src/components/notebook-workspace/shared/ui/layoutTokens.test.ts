import { describe, expect, it } from 'vitest'
import {
  workspaceLayout,
  workspaceRadiusPx,
  workspaceSpace,
} from './layoutTokens'

describe('workspace layout tokens', () => {
  it('exposes 4/8/12/16/24 px scale via MUI spacing units', () => {
    expect(workspaceSpace).toEqual({
      xxs: 0.5,
      sm: 1,
      md: 1.5,
      lg: 2,
      xl: 3,
    })
  })

  it('exposes radius 8/10/12 px', () => {
    expect(workspaceRadiusPx).toEqual({ sm: 8, md: 10, lg: 12 })
  })

  it('maps semantic aliases to the locked scale', () => {
    expect(workspaceLayout.panelPaddingX).toBe(workspaceSpace.xl)
    expect(workspaceLayout.panelPaddingY).toBe(workspaceSpace.lg)
    expect(workspaceLayout.panelTitleToBody).toBe(workspaceSpace.md)
    expect(workspaceLayout.listRowGap).toBe(workspaceSpace.sm)
    expect(workspaceLayout.listInlineGap).toBe(workspaceSpace.sm)
    expect(workspaceLayout.chatMessageGap).toBe(workspaceSpace.lg)
  })
})
