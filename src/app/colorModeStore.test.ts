import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COLOR_MODE_STORAGE_KEY } from './colorMode'
import {
  resetColorModeStore,
  selectResolvedColorMode,
  setColorMode,
  useColorModeStore,
  useResolvedColorMode,
} from './colorModeStore'

const createMemoryStorage = () => {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    entries,
  }
}

let storage: ReturnType<typeof createMemoryStorage>

beforeEach(() => {
  storage = createMemoryStorage()
  vi.stubGlobal('localStorage', storage)
  resetColorModeStore()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('colorModeStore', () => {
  it('setMode 同时改状态与 localStorage', () => {
    setColorMode('dark')
    expect(useColorModeStore.getState().mode).toBe('dark')
    expect(storage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark')

    setColorMode('system')
    expect(useColorModeStore.getState().mode).toBe('system')
    expect(storage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('system')
  })

  it('非法值不会污染状态（旧数据 / 手工改坏的存储）', () => {
    setColorMode('dark')
    setColorMode('midnight' as never)
    expect(useColorModeStore.getState().mode).toBe('dark')
    expect(storage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark')
  })

  it('system 模式下解析结果跟着系统偏好走', () => {
    setColorMode('system')
    useColorModeStore.getState().setSystemPrefersDark(true)
    expect(selectResolvedColorMode(useColorModeStore.getState())).toBe('dark')

    useColorModeStore.getState().setSystemPrefersDark(false)
    expect(selectResolvedColorMode(useColorModeStore.getState())).toBe('light')

    // 显式选择不受系统影响
    setColorMode('light')
    useColorModeStore.getState().setSystemPrefersDark(true)
    expect(selectResolvedColorMode(useColorModeStore.getState())).toBe('light')
  })

  it('syncStoredMode 跟随别的标签页写入的值', () => {
    setColorMode('light')
    storage.setItem(COLOR_MODE_STORAGE_KEY, 'dark')

    useColorModeStore.getState().syncStoredMode()
    expect(useColorModeStore.getState().mode).toBe('dark')
  })

  it('提供了读取解析模式的 hook 入口', () => {
    expect(useResolvedColorMode).toBeTypeOf('function')
    expect(useColorModeStore.getState().mode).toBe('light')
  })
})

describe('colorModeStore 初始化', () => {
  it('启动时从 localStorage 恢复上次的选择（下次打开还生效）', async () => {
    storage.setItem(COLOR_MODE_STORAGE_KEY, 'dark')
    vi.resetModules()

    const fresh = await import('./colorModeStore')
    expect(fresh.useColorModeStore.getState().mode).toBe('dark')
  })

  it('存储里是垃圾值时回落默认浅色', async () => {
    storage.setItem(COLOR_MODE_STORAGE_KEY, '{"mode":"dark"}')
    vi.resetModules()

    const fresh = await import('./colorModeStore')
    expect(fresh.useColorModeStore.getState().mode).toBe('light')
  })
})
