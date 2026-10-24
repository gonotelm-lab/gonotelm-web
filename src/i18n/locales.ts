/** 界面语言枚举与默认值；无副作用，可供 localPreferences / i18n 共用。 */
export const SUPPORTED_LOCALES = ['zh', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'zh'
