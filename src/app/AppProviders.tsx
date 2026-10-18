import { useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'
import {
  COLOR_MODE_STORAGE_KEY,
  applyColorModeToDocument,
  readSystemPrefersDark,
  subscribeToSystemColorMode,
  type ResolvedColorMode,
} from './colorMode'
import { useColorModeStore, useResolvedColorMode } from './colorModeStore'
import { resolveAppTheme } from './theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/** 把解析结果落到文档上（CSS 变量、`color-scheme`、图标、地址栏颜色）。 */
const useDocumentColorMode = (resolvedMode: ResolvedColorMode) => {
  useEffect(() => {
    applyColorModeToDocument(resolvedMode)
  }, [resolvedMode])
}

/**
 * 系统配色订阅 + 多标签页同步。
 * 首帧由 index.html 的内联脚本负责，这里负责挂载后的持续跟随。
 */
const useSystemColorMode = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    // 模块加载到挂载之间系统偏好可能已变化，先对齐一次。
    useColorModeStore.getState().setSystemPrefersDark(readSystemPrefersDark())
    const unsubscribeSystem = subscribeToSystemColorMode((prefersDark) => {
      useColorModeStore.getState().setSystemPrefersDark(prefersDark)
    })
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === COLOR_MODE_STORAGE_KEY) {
        useColorModeStore.getState().syncStoredMode()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      unsubscribeSystem()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])
}

/**
 * App 的唯一装配点：颜色模式主题、MUI baseline、react-query。
 * 主题随解析后的模式整体替换，`theme.palette.mode` 与 `theme.workspacePalette`
 * 因此同步切换，组件里既有的 `sx={(theme) => ...}` 不需要额外分支。
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const resolvedMode = useResolvedColorMode()
  useDocumentColorMode(resolvedMode)
  useSystemColorMode()

  return (
    <ThemeProvider theme={resolveAppTheme(resolvedMode)}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
