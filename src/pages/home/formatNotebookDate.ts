/**
 * 首页卡片日期统一格式：
 * - 无效时间戳返回占位文案
 * - 使用英文短月格式，贴近目标 UI
 */
const notebookDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatNotebookDate(updatedAt: number): string {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return 'Unknown date'
  }

  return notebookDateFormatter.format(new Date(updatedAt))
}
