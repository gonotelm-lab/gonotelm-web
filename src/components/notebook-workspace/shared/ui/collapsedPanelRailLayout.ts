/** Shared geometry for Sources / Studio collapsed rails. */
export const collapsedPanelRailWidthPx = 52
export const collapsedPanelRailIconButtonPx = 34
/** Icon 间距（对应 workspaceSpace.xxs = 4px）。 */
export const collapsedPanelRailSlotGapPx = 4
/** 防止极端高度下渲染过多节点的硬顶。 */
export const collapsedPanelRailHardMaxSlots = 32

export const resolveCollapsedPanelRailSlotCount = (availableHeightPx: number): number => {
  if (availableHeightPx <= 0) return 0
  const stride = collapsedPanelRailIconButtonPx + collapsedPanelRailSlotGapPx
  const count = Math.floor(
    (availableHeightPx + collapsedPanelRailSlotGapPx) / stride,
  )
  return Math.max(0, Math.min(count, collapsedPanelRailHardMaxSlots))
}
