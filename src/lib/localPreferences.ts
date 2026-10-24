import {
  DEFAULT_COLOR_MODE,
  isColorMode,
  type ColorMode,
} from '@/app/colorMode'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from '@/i18n/locales'
import type { ListNotebooksScope, ListNotebooksSortBy } from '@/types/api'

/**
 * 浏览器本地「用户偏好」唯一入口。
 *
 * 纳入：设置对话框（语言、颜色模式）+ 首页列表（范围、排序）。
 * 不纳入：按 notebook/chat 分片的工作区状态（来源勾选、对话设置、流式断点）、
 * 以及 sessionStorage 里的登录回跳——那些是会话/资源态，不是全局偏好。
 */
export const LOCAL_PREFERENCES_STORAGE_KEY = 'gonotelm.preferences'

export interface HomeListPreferences {
  scope: ListNotebooksScope
  sortBy: ListNotebooksSortBy
}

export interface LocalPreferences {
  locale: AppLocale
  colorMode: ColorMode
  home: HomeListPreferences
}

export const DEFAULT_HOME_LIST_PREFERENCES: HomeListPreferences = {
  scope: 'owned',
  sortBy: 'create_time',
}

export const DEFAULT_LOCAL_PREFERENCES: LocalPreferences = {
  locale: DEFAULT_LOCALE,
  colorMode: DEFAULT_COLOR_MODE,
  home: { ...DEFAULT_HOME_LIST_PREFERENCES },
}

const SCOPES: readonly ListNotebooksScope[] = ['owned', 'shared']
const SORT_BYS: readonly ListNotebooksSortBy[] = ['last_active', 'create_time']

const isScope = (value: unknown): value is ListNotebooksScope =>
  typeof value === 'string' && (SCOPES as readonly string[]).includes(value)

const isSortBy = (value: unknown): value is ListNotebooksSortBy =>
  typeof value === 'string' && (SORT_BYS as readonly string[]).includes(value)

const isLocale = (value: unknown): value is AppLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)

export const parseLocale = (raw: string | null | undefined): AppLocale => {
  if (!raw) {
    return DEFAULT_LOCALE
  }
  const normalized = raw.toLowerCase()
  if (normalized.startsWith('en')) {
    return 'en'
  }
  if (normalized.startsWith('zh')) {
    return 'zh'
  }
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}

export const parseHomeListPreferences = (
  raw: unknown,
): HomeListPreferences => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_HOME_LIST_PREFERENCES }
  }
  const value = raw as Partial<HomeListPreferences>
  return {
    scope: isScope(value.scope) ? value.scope : DEFAULT_HOME_LIST_PREFERENCES.scope,
    sortBy: isSortBy(value.sortBy) ? value.sortBy : DEFAULT_HOME_LIST_PREFERENCES.sortBy,
  }
}

export const parseLocalPreferences = (raw: string | null | undefined): LocalPreferences => {
  if (!raw) {
    return { ...DEFAULT_LOCAL_PREFERENCES, home: { ...DEFAULT_HOME_LIST_PREFERENCES } }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalPreferences>
    return {
      locale: parseLocale(typeof parsed.locale === 'string' ? parsed.locale : null),
      colorMode: isColorMode(parsed.colorMode) ? parsed.colorMode : DEFAULT_COLOR_MODE,
      home: parseHomeListPreferences(parsed.home),
    }
  } catch {
    return { ...DEFAULT_LOCAL_PREFERENCES, home: { ...DEFAULT_HOME_LIST_PREFERENCES } }
  }
}

export const readLocalPreferences = (): LocalPreferences => {
  try {
    return parseLocalPreferences(globalThis.localStorage?.getItem(LOCAL_PREFERENCES_STORAGE_KEY))
  } catch {
    return { ...DEFAULT_LOCAL_PREFERENCES, home: { ...DEFAULT_HOME_LIST_PREFERENCES } }
  }
}

export const writeLocalPreferences = (prefs: LocalPreferences): void => {
  const next: LocalPreferences = {
    locale: parseLocale(prefs.locale),
    colorMode: isColorMode(prefs.colorMode) ? prefs.colorMode : DEFAULT_COLOR_MODE,
    home: parseHomeListPreferences(prefs.home),
  }
  try {
    globalThis.localStorage?.setItem(LOCAL_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 存不下也不影响本次会话内存态。
  }
}

/** 合并补丁后落盘，返回合并结果。 */
export const patchLocalPreferences = (patch: {
  locale?: AppLocale
  colorMode?: ColorMode
  home?: Partial<HomeListPreferences>
}): LocalPreferences => {
  const current = readLocalPreferences()
  const next: LocalPreferences = {
    locale: patch.locale ?? current.locale,
    colorMode: patch.colorMode ?? current.colorMode,
    home: parseHomeListPreferences({
      ...current.home,
      ...patch.home,
    }),
  }
  writeLocalPreferences(next)
  return next
}

/** 首页列表范围/排序的便捷读写（仍落在同一份 LocalPreferences）。 */
export const readHomePreferences = (): HomeListPreferences => readLocalPreferences().home

export const patchHomePreferences = (
  patch: Partial<HomeListPreferences>,
): HomeListPreferences => patchLocalPreferences({ home: patch }).home
