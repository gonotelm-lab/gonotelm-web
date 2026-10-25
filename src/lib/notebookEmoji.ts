/**
 * 首页 owned 卡片左上角的占位 emoji：notebookId 确定性映射到 64 个
 * Unicode 通用 emoji，让没有 owner 行的卡片顶部不空荡。
 * 只用 Unicode 基本平面内稳定的字形，避免依赖字体里的新版 emoji。
 */
const NOTEBOOK_EMOJIS = [
  '📚', '🧠', '💡', '🔥', '🌱', '🌍', '🧩', '📝', '🚀', '⭐',
  '🍵', '🧪', '🎨', '🎵', '📌', '🍀', '☀️', '🌙', '⚡', '🏆',
  '🧭', '🔎', '💬', '🗂️', '🎯', '🦊', '🐙', '🌸', '🪄', '🧳',
  '🐱', '🐶', '🦉', '🐝', '🐢', '🐳', '🦋', '🌵', '🌲', '🍄',
  '🌈', '❄️', '🕰️', '🔖', '🗝️', '🧸', '🎪', '🎬', '🎲', '🎧',
  '📷', '🔬', '⚙️', '🧬', '🛰️', '🌊', '🍃', '🌷', '🐘', '🦜',
  '🪴', '🏔️', '🛶', '🍹',
] as const

/** FNV-1a 32-bit：字符序不影响（同 id 恒同 emoji），分布足够分散。 */
export function getNotebookEmoji(notebookId: string): string {
  if (!notebookId) {
    return NOTEBOOK_EMOJIS[0]
  }
  let hash = 0x811c9dc5
  for (let i = 0; i < notebookId.length; i += 1) {
    hash ^= notebookId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return NOTEBOOK_EMOJIS[(hash >>> 0) % NOTEBOOK_EMOJIS.length]
}
