import { describe, expect, it } from 'vitest'
import {
  resolveStudioCollapsedRailSlotCount,
  studioCollapsedRailHardMaxSlots,
  studioCollapsedRailIconButtonPx,
  studioCollapsedRailSlotGapPx,
} from './studioCollapsedRailLayout'

describe('resolveStudioCollapsedRailSlotCount', () => {
  it('按高度撑满槽位，不滚动', () => {
    const stride = studioCollapsedRailIconButtonPx + studioCollapsedRailSlotGapPx
    expect(resolveStudioCollapsedRailSlotCount(stride * 3 - studioCollapsedRailSlotGapPx)).toBe(3)
    expect(resolveStudioCollapsedRailSlotCount(stride * 3 - studioCollapsedRailSlotGapPx - 1)).toBe(2)
  })

  it('高度不足时为 0，并有硬顶', () => {
    expect(resolveStudioCollapsedRailSlotCount(0)).toBe(0)
    expect(resolveStudioCollapsedRailSlotCount(10_000)).toBe(studioCollapsedRailHardMaxSlots)
  })
})
