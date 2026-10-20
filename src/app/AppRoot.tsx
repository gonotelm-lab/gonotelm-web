import { Outlet } from 'react-router-dom'
import { GlobalCallbackFailureToast } from '../components/auth/GlobalCallbackFailureToast'
import { GlobalApiErrorToast } from '../components/notifications/GlobalApiErrorToast'

/**
 * 根布局：渲染当前页面，并挂上与页面无关的全局提示。
 *
 * 单独一个文件是为了让 `router.tsx` 只导出 `router`（fast refresh 要求
 * 一个文件要么只导出组件，要么只导出非组件）。
 */
export function AppRoot() {
  return (
    <>
      <Outlet />
      <GlobalCallbackFailureToast />
      <GlobalApiErrorToast />
    </>
  )
}
