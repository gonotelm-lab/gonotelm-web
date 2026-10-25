import i18n from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/locales'

/**
 * 首页卡片日期统一格式：
 * - 无效时间戳返回占位文案
 * - 跟随当前界面语言：zh → zh-CN（2025年7月18日），en → en-US（Jul 18, 2025）
 * - 同一 locale 的 formatter 缓存复用，避免每张卡片反复 new
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>()

/** 应用语言收敛到 BCP47：zh / en 之外的取值退回默认语言。 */
function resolveIntlLocale(language: string | undefined): string {
  const normalized = (language ?? DEFAULT_LOCALE).toLowerCase()
  if (normalized.startsWith('zh')) {
    return 'zh-CN'
  }
  if (normalized.startsWith('en')) {
    return 'en-US'
  }
  return DEFAULT_LOCALE === 'zh' ? 'zh-CN' : 'en-US'
}

function getFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    formatterCache.set(locale, formatter)
  }
  return formatter
}

export function formatNotebookDate(updatedAt: number): string {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return i18n.t('home:card.unknownDate')
  }

  return getFormatter(
    resolveIntlLocale(i18n.resolvedLanguage ?? i18n.language),
  ).format(new Date(updatedAt))
}
