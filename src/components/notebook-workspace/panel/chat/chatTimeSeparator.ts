/** 微信式：相邻 user 间隔达到该阈值才显示时间标签。 */
export const CHAT_TIME_SEPARATOR_GAP_MS = 5 * 60 * 1000

const MS_PER_DAY = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

export type ChatTimeSeparatorMessage = {
  role: 'user' | 'assistant'
  createTime?: number
}

export const hasValidChatCreateTime = (
  createTime: number | undefined,
): createTime is number => typeof createTime === 'number' && createTime > 0

/**
 * 归一化为毫秒。小于 1e12 视为秒级时间戳（约 2001 年前的 ms 不会出现在聊天场景）。
 */
export function normalizeChatCreateTimeMs(createTime: number): number {
  if (!Number.isFinite(createTime) || createTime <= 0) {
    return 0
  }
  return createTime < 1e12 ? createTime * 1000 : createTime
}

/**
 * 仅对 user 计算是否在气泡上方显示时间；assistant 恒为 false。
 * 间隔锚定「上一条有效 createTime 的 user」，中间的 AI 回复不影响。
 */
export function computeChatTimeSeparatorFlags(
  messages: readonly ChatTimeSeparatorMessage[],
): boolean[] {
  let lastUserCreateTime: number | null = null
  return messages.map((message) => {
    if (message.role !== 'user' || !hasValidChatCreateTime(message.createTime)) {
      return false
    }
    const show =
      lastUserCreateTime === null ||
      message.createTime - lastUserCreateTime >= CHAT_TIME_SEPARATOR_GAP_MS
    lastUserCreateTime = message.createTime
    return show
  })
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const startOfLocalDayMs = (ms: number) => {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const formatClockHm = (ms: number) => {
  const date = new Date(ms)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 微信聊天页风格的相对日期文案（本地时区日历日）。 */
export function formatChatTimeLabel(createTimeMs: number, nowMs: number = Date.now()): string {
  const time = formatClockHm(createTimeMs)
  const dayDiff = Math.round(
    (startOfLocalDayMs(nowMs) - startOfLocalDayMs(createTimeMs)) / MS_PER_DAY,
  )

  if (dayDiff === 0) {
    return time
  }
  if (dayDiff === 1) {
    return `昨天 ${time}`
  }
  if (dayDiff >= 2 && dayDiff <= 6) {
    return `${WEEKDAY_LABELS[new Date(createTimeMs).getDay()]} ${time}`
  }

  const date = new Date(createTimeMs)
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`
  const sameYear = date.getFullYear() === new Date(nowMs).getFullYear()
  if (sameYear) {
    return `${monthDay} ${time}`
  }
  return `${date.getFullYear()}年${monthDay} ${time}`
}
