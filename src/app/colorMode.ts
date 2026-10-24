/**
 * 颜色模式（浅色 / 深色 / 跟随系统）的纯逻辑与 DOM 应用。
 *
 * 持久化在 `lib/localPreferences`（`gonotelm.preferences.colorMode`）。
 * 生产环境里 index.html 的内联脚本会先按同一份规则写一次 `<html data-theme>`，
 * 让首帧就是正确的颜色，因此这里的常量与 `index.html` 必须保持一致
 * （`colorMode.test.ts` 会校验两边同步）。
 */

export const COLOR_MODES = ['light', 'dark', 'system'] as const

export type ColorMode = (typeof COLOR_MODES)[number]

/** `system` 解析后的实际模式。 */
export type ResolvedColorMode = Exclude<ColorMode, 'system'>

/** 默认浅色：与「设置 → 通用」里语言默认中文一样，新用户看到的是当前既有外观。 */
export const DEFAULT_COLOR_MODE: ColorMode = 'light'

export const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/** `<html>` 上承载解析结果的属性；tokens.css 的深色变量挂在它下面。 */
export const COLOR_MODE_ATTRIBUTE = 'data-theme'

export const FAVICON_ELEMENT_ID = 'app-favicon'
export const THEME_COLOR_META_SELECTOR = 'meta[name="theme-color"]'

/**
 * 标签页图标是独立资源而不是 CSS 变量，所以按解析后的模式手工切换：
 * 浅色底用 forest 绿标记，深色底用浅色标记。
 */
export const FAVICON_HREF_BY_MODE: Record<ResolvedColorMode, string> = {
  light: '/favicon.svg',
  dark: '/favicon-dark.svg',
}

/** 移动端浏览器地址栏配色，取各自模式的画布底色。 */
export const THEME_COLOR_BY_MODE: Record<ResolvedColorMode, string> = {
  light: '#efebe2',
  dark: '#1b211d',
}

export const isColorMode = (value: unknown): value is ColorMode =>
  typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value)

export const isResolvedColorMode = (value: unknown): value is ResolvedColorMode =>
  value === 'light' || value === 'dark'

/** 存储值可能是旧版本、手工改坏或被同步脚本写脏的数据，一律回落到默认浅色。 */
export const parseColorMode = (rawValue: string | null | undefined): ColorMode =>
  isColorMode(rawValue) ? rawValue : DEFAULT_COLOR_MODE

/** 解析系统偏好；没有 matchMedia（node 测试）或读取抛错时按浅色处理。 */
export const readSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  try {
    return window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches
  } catch {
    return false
  }
}

export const resolveColorMode = (
  mode: ColorMode,
  systemPrefersDark: boolean,
): ResolvedColorMode => (mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode)

/**
 * 订阅系统配色变化。返回取消订阅函数；宿主环境不支持时返回 noop。
 */
export const subscribeToSystemColorMode = (listener: (prefersDark: boolean) => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  let mediaQueryList: MediaQueryList
  try {
    mediaQueryList = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY)
  } catch {
    return () => {}
  }
  const handleChange = (event: MediaQueryListEvent) => {
    listener(event.matches)
  }
  mediaQueryList.addEventListener('change', handleChange)
  return () => mediaQueryList.removeEventListener('change', handleChange)
}

/**
 * 把解析后的模式落到文档上：CSS 变量、原生控件（`color-scheme`）、标签页图标、
 * 移动端地址栏颜色。由内联首帧脚本与 `ColorModeSync` 共用，保证两处行为一致。
 */
export const applyColorModeToDocument = (resolvedMode: ResolvedColorMode): void => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.setAttribute(COLOR_MODE_ATTRIBUTE, resolvedMode)
  root.style.colorScheme = resolvedMode

  const favicon = document.getElementById(FAVICON_ELEMENT_ID)
  favicon?.setAttribute('href', FAVICON_HREF_BY_MODE[resolvedMode])

  const themeColorMeta = document.querySelector(THEME_COLOR_META_SELECTOR)
  themeColorMeta?.setAttribute('content', THEME_COLOR_BY_MODE[resolvedMode])
}
