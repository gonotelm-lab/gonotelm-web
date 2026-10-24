import i18n, { DEFAULT_LOCALE } from '@/i18n'

export type StudioOutputLanguage = 'zh-CN' | 'en-US'

/** Map UI locale (LocalPreferences.locale / i18n) to Studio generation language defaults. */
export function getDefaultStudioOutputLanguage(
  lng: string = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE,
): StudioOutputLanguage {
  return lng.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN'
}
