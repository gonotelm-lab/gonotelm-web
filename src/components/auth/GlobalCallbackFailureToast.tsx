import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AUTH_ERROR_PATH,
  CALLBACK_SETTINGS_ACCOUNT,
  CALLBACK_SETTINGS_PARAM,
  parseCallbackFailure,
} from '../../lib/auth'
import { CallbackFailureToast } from './CallbackFailureToast'
import { describeCallbackFailure } from './callbackFailureText'

/**
 * 全局回调失败提示：任何页面落地时带 `?reason=&provider=` 就弹一次 toast。
 *
 * 挂根布局里，页面各自不用接线。已知来源：
 * - 登录失败落 `/login?reason=…` → 登录语义；
 * - 绑定失败落 `?settings=account&reason=…`（含错误页「返回设置」把 reason 带回来）→ 绑定语义。
 *
 * 流程由**路径**决定（与后端的分工一致），不靠参数猜。
 * 例外：`/auth/error` 本身就是绑定失败落地页，页面里已经写清了原因，不再重复弹。
 */
export function GlobalCallbackFailureToast() {
  const { t } = useTranslation('auth')
  const location = useLocation()
  const failure = parseCallbackFailure(location.search)
  if (!failure || location.pathname === AUTH_ERROR_PATH) {
    return null
  }

  const mode =
    new URLSearchParams(location.search).get(CALLBACK_SETTINGS_PARAM) === CALLBACK_SETTINGS_ACCOUNT
      ? 'bind'
      : 'login'
  return (
    // key 带上 location.key：每次导航落地都重新弹一次，而不是被上一次的关闭状态吃掉。
    <CallbackFailureToast
      key={`${location.key}:${failure.reason}`}
      message={describeCallbackFailure(failure.reason, failure.provider, mode, t)}
    />
  )
}
