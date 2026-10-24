/**
 * 浏览器 Web Notification 的统一入口。
 *
 * 兼容性要点：
 * - API 只在 secure context 下存在（Chrome/Firefox/Safari 一致），http 站点视为不支持。
 * - iOS Safari 长期未暴露该 API（16.4+ 仅限 PWA push），走 `unsupported` 分支。
 * - `requestPermission` 旧版 WebKit/Safari 是回调式（带 1 个形参），现代浏览器是 Promise，
 *   两者都兼容处理。
 * - Firefox Android 不允许 JS 直接 `new Notification()`（会抛错），只认
 *   `ServiceWorkerRegistration.showNotification`，构造器失败时兜底走 Service Worker。
 * - 部分浏览器不派发 `permissionchange`，订阅里补了 focus / visibilitychange 兜底重查。
 */

export type WebNotificationSupport = 'unsupported' | 'denied' | 'default' | 'granted'

export interface ShowWebNotificationOptions {
  title: string
  body?: string
  /** 相同 tag 的通知会互相覆盖，避免任务列表刷出一摞重复提醒。 */
  tag?: string
  /** 用户点击通知时的回调；一般由调用方把窗口带回前台。 */
  onClick?: () => void
}

type NotificationCtor = typeof Notification

/** Chromium 在构造器（静态）上派发 `permissionchange`，类型库未收录，这里放宽。 */
type NotificationCtorWithEvents = NotificationCtor & {
  addEventListener?: (type: string, handler: () => void) => void
  removeEventListener?: (type: string, handler: () => void) => void
}

const resolveNotificationCtor = (): NotificationCtorWithEvents | null => {
  if (typeof window === 'undefined') {
    return null
  }
  if (!('Notification' in window) || typeof window.Notification !== 'function') {
    return null
  }
  // Web Notification 仅在 secure context 下可用，非安全上下文一律视为不支持。
  if (window.isSecureContext === false) {
    return null
  }
  return window.Notification as NotificationCtorWithEvents
}

/** 当前浏览器对网页通知的支持 / 授权状态。 */
export const getWebNotificationSupport = (): WebNotificationSupport => {
  const ctor = resolveNotificationCtor()
  if (!ctor) {
    return 'unsupported'
  }
  const permission = ctor.permission
  if (permission === 'granted' || permission === 'denied') {
    return permission
  }
  return 'default'
}

/**
 * 以用户手势请求通知授权并返回请求后的支持状态。
 * 被浏览器拒绝（denied）后程序无法再弹授权框，只能由用户在站点设置里恢复。
 */
export const requestWebNotificationPermission = async (): Promise<WebNotificationSupport> => {
  const ctor = resolveNotificationCtor()
  if (!ctor) {
    return 'unsupported'
  }
  try {
    const requestPermission = ctor.requestPermission.bind(ctor)
    // 回调式（旧 WebKit）：无一返回值，形参 1 个 → 用 Promise 包回调。
    if (requestPermission.length > 0) {
      await new Promise<unknown>((resolve) => requestPermission(resolve))
    } else {
      await requestPermission()
    }
  } catch {
    // iOS 某些版本在非用户手势下会直接 reject；回落到读取当前 permission。
  }
  return getWebNotificationSupport()
}

/**
 * 订阅通知授权状态变化。
 * 返回取消订阅函数；订阅建立时会立即回调一次当前状态。
 */
export const subscribeWebNotificationPermissionChange = (
  listener: (support: WebNotificationSupport) => void,
): (() => void) => {
  const emit = () => listener(getWebNotificationSupport())
  emit()
  let offPermissionChange: (() => void) | undefined
  const ctor = resolveNotificationCtor()
  if (ctor && typeof ctor.addEventListener === 'function') {
    ctor.addEventListener('permissionchange', emit)
    offPermissionChange = () => {
      if (typeof ctor.removeEventListener === 'function') {
        ctor.removeEventListener('permissionchange', emit)
      }
    }
  }
  // `permissionchange` 在 Firefox 等浏览器上不触发；回到页面时兜底重查一次。
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', emit)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', emit)
  }

  return () => {
    offPermissionChange?.()
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', emit)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', emit)
    }
  }
}

const showNotificationViaServiceWorker = async (
  title: string,
  options: NotificationOptions,
): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.showNotification(title, options)
      return true
    }
  } catch {
    // 兜底也失败就视为未发出。
  }
  return false
}

/**
 * 发浏览器通知；仅在授权为 granted 时生效。
 * 返回是否真正发出（调用方可据此外推降级逻辑，如 app 内 toast）。
 */
export const showWebNotification = async ({
  title,
  body,
  tag,
  onClick,
}: ShowWebNotificationOptions): Promise<boolean> => {
  const ctor = resolveNotificationCtor()
  if (!ctor || getWebNotificationSupport() !== 'granted') {
    return false
  }
  const options: NotificationOptions = {
    body: body ?? '',
    tag,
    icon: '/favicon.png',
  }
  try {
    const notification = new ctor(title, options)
    if (onClick) {
      notification.onclick = () => onClick()
    }
    return true
  } catch {
    // Firefox Android：构造器抛错，仅支持 Service Worker 注册弹通知。
    return showNotificationViaServiceWorker(title, options)
  }
}
