import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonZh from '../locales/zh/common.json'
import homeZh from '../locales/zh/home.json'
import workspaceZh from '../locales/zh/workspace.json'
import sourcesZh from '../locales/zh/sources.json'
import studioZh from '../locales/zh/studio.json'
import chatZh from '../locales/zh/chat.json'
import authZh from '../locales/zh/auth.json'
import settingsZh from '../locales/zh/settings.json'

import commonEn from '../locales/en/common.json'
import homeEn from '../locales/en/home.json'
import workspaceEn from '../locales/en/workspace.json'
import sourcesEn from '../locales/en/sources.json'
import studioEn from '../locales/en/studio.json'
import chatEn from '../locales/en/chat.json'
import authEn from '../locales/en/auth.json'
import settingsEn from '../locales/en/settings.json'

export const LOCALE_STORAGE_KEY = 'gonotelm.locale'
export const SUPPORTED_LOCALES = ['zh', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'zh'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        common: commonZh,
        home: homeZh,
        workspace: workspaceZh,
        sources: sourcesZh,
        studio: studioZh,
        chat: chatZh,
        auth: authZh,
        settings: settingsZh,
      },
      en: {
        common: commonEn,
        home: homeEn,
        workspace: workspaceEn,
        sources: sourcesEn,
        studio: studioEn,
        chat: chatEn,
        auth: authEn,
        settings: settingsEn,
      },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: 'common',
    ns: ['common', 'home', 'workspace', 'sources', 'studio', 'chat', 'auth', 'settings'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
  })

const syncDocumentLang = (lng: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng === 'en' ? 'en' : 'zh-CN'
  }
}

syncDocumentLang(i18n.resolvedLanguage ?? DEFAULT_LOCALE)
i18n.on('languageChanged', syncDocumentLang)

export default i18n
