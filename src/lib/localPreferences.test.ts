import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCAL_PREFERENCES,
  LOCAL_PREFERENCES_STORAGE_KEY,
  parseLocalPreferences,
  patchHomePreferences,
  patchLocalPreferences,
  readHomePreferences,
  readLocalPreferences,
  writeLocalPreferences,
} from './localPreferences'

const createMemoryStorage = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('localPreferences', () => {
  it('无存储时回落默认', () => {
    expect(readLocalPreferences()).toEqual(DEFAULT_LOCAL_PREFERENCES)
  })

  it('整份读写语言 / 颜色 / 首页筛选', () => {
    writeLocalPreferences({
      locale: 'en',
      colorMode: 'dark',
      home: { scope: 'shared', sortBy: 'last_active' },
    })
    expect(readLocalPreferences()).toEqual({
      locale: 'en',
      colorMode: 'dark',
      home: { scope: 'shared', sortBy: 'last_active' },
    })
    expect(localStorage.getItem(LOCAL_PREFERENCES_STORAGE_KEY)).toContain('"locale":"en"')
  })

  it('patch 局部字段并保留其余', () => {
    writeLocalPreferences({
      locale: 'zh',
      colorMode: 'system',
      home: { scope: 'owned', sortBy: 'create_time' },
    })
    expect(patchLocalPreferences({ colorMode: 'dark' }).colorMode).toBe('dark')
    expect(readLocalPreferences().locale).toBe('zh')
    expect(patchHomePreferences({ scope: 'shared' })).toEqual({
      scope: 'shared',
      sortBy: 'create_time',
    })
    expect(readHomePreferences().scope).toBe('shared')
  })

  it('脏 JSON / 非法枚举回落默认字段', () => {
    expect(parseLocalPreferences('{')).toEqual(DEFAULT_LOCAL_PREFERENCES)
    expect(
      parseLocalPreferences(
        JSON.stringify({ locale: 'fr', colorMode: 'neon', home: { scope: 'x' } }),
      ),
    ).toEqual(DEFAULT_LOCAL_PREFERENCES)
  })

  it('localStorage 不可用时不抛', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(readLocalPreferences()).toEqual(DEFAULT_LOCAL_PREFERENCES)
    expect(() =>
      writeLocalPreferences({
        locale: 'en',
        colorMode: 'dark',
        home: { scope: 'shared', sortBy: 'last_active' },
      }),
    ).not.toThrow()
  })
})
