/** 与后端 pinentity.MaxPinsAllowed 对齐。 */
export const MAX_PINNED_NOTEBOOKS = 50

export function isPinLimitReached(pinnedCount: number): boolean {
  return pinnedCount >= MAX_PINNED_NOTEBOOKS
}
