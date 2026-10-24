import { create } from 'zustand'
import { patchLocalPreferences, readLocalPreferences } from '@/lib/localPreferences'
import {
  isColorMode,
  readSystemPrefersDark,
  resolveColorMode,
  type ColorMode,
  type ResolvedColorMode,
} from './colorMode'

/**
 * 颜色模式的全局状态。
 *
 * 用 zustand 而不是 context：装配点（`AppProviders`）与设置面板位于组件树两处，
 * 而 store 能在任意位置读写，也便于在没有 React 的测试里直接驱动。
 * 持久化统一走 LocalPreferences（与语言、首页筛选同一份）。
 */
interface ColorModeStoreState {
  mode: ColorMode
  systemPrefersDark: boolean
  /** 写入 LocalPreferences 并切换模式（持久化与状态在同一个动作里，避免漏存）。 */
  setMode: (mode: ColorMode) => void
  setSystemPrefersDark: (prefersDark: boolean) => void
  /** 多标签页同步：别的标签页改了模式后按存储值重读。 */
  syncStoredMode: () => void
}

export const useColorModeStore = create<ColorModeStoreState>((set) => ({
  mode: readLocalPreferences().colorMode,
  systemPrefersDark: readSystemPrefersDark(),
  setMode: (mode) => {
    if (!isColorMode(mode)) {
      return
    }
    patchLocalPreferences({ colorMode: mode })
    set((state) => (state.mode === mode ? state : { mode }))
  },
  setSystemPrefersDark: (prefersDark) =>
    set((state) => (state.systemPrefersDark === prefersDark ? state : { systemPrefersDark: prefersDark })),
  syncStoredMode: () =>
    set((state) => {
      const storedMode = readLocalPreferences().colorMode
      return storedMode === state.mode ? state : { mode: storedMode }
    }),
}))

export const selectResolvedColorMode = (state: ColorModeStoreState): ResolvedColorMode =>
  resolveColorMode(state.mode, state.systemPrefersDark)

export const useColorMode = (): ColorMode => useColorModeStore((state) => state.mode)

export const useResolvedColorMode = (): ResolvedColorMode =>
  useColorModeStore(selectResolvedColorMode)

/** 组件外（事件回调、测试）切换模式。 */
export const setColorMode = (mode: ColorMode): void => {
  useColorModeStore.getState().setMode(mode)
}

/** 测试用：把 store 恢复到「未选择过」的初始状态。 */
export const resetColorModeStore = (): void => {
  useColorModeStore.setState({
    mode: readLocalPreferences().colorMode,
    systemPrefersDark: readSystemPrefersDark(),
  })
}
