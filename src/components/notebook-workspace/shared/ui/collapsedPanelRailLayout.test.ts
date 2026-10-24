import { describe, expect, it } from 'vitest'
import {
  collapsedPanelRailHardMaxSlots,
  collapsedPanelRailIconButtonPx,
  collapsedPanelRailSlotGapPx,
  resolveCollapsedPanelRailSlotCount,
} from './collapsedPanelRailLayout'

describe('resolveCollapsedPanelRailSlotCount', () => {
  it('按高度撑满槽位，不滚动', () => {
    const stride = collapsedPanelRailIconButtonPx + collapsedPanelRailSlotGapPx
    expect(resolveCollapsedPanelRailSlotCount(stride * 3 - collapsedPanelRailSlotGapPx)).toBe(3)
    expect(resolveCollapsedPanelRailSlotCount(stride * 3 - collapsedPanelRailSlotGapPx - 1)).toBe(2)
  })

  it('高度不足时为 0，并有硬顶', () => {
    expect(resolveCollapsedPanelRailSlotCount(0)).toBe(0)
    expect(resolveCollapsedPanelRailSlotCount(10_000)).toBe(collapsedPanelRailHardMaxSlots)
  })
})
