import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWebNotificationSupport,
  requestWebNotificationPermission,
  showWebNotification,
  subscribeWebNotificationPermissionChange,
  type WebNotificationSupport,
} from './webNotifications'

type FakeNotificationRecord = {
  title: string
  body: string
  tag?: string
  icon?: string
  onclick: (() => void) | null
}

interface FakeCtor {
  permission: WebNotificationSupport
  requestPermission: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  instances: FakeNotificationRecord[]
  behavior: 'throw' | 'store'
}

/** 结论都从 `Notification.permission` 读，stub 需要可改写当前状态。 */
let currentPermission: WebNotificationSupport
let ctorBehavior: FakeCtor['behavior']
let requestPermissionImpl: (() => Promise<unknown>) | null
let ctorInstances: FakeNotificationRecord[]

const FakeNotification = function (
  this: unknown,
  title: string,
  options: { body?: string } & Record<string, unknown>,
) {
  if (ctorBehavior === 'throw') {
    // Firefox Android 场景：构造器直接抛错。
    throw new Error(' unusable ')
  }
  void this
  ctorInstances.push({
    title,
    body: options.body ?? '',
    tag: options.tag as string | undefined,
    icon: options.icon as string | undefined,
    onclick: null,
  })
  return {
    set onclick(handler: (() => void) | null) {
      if (ctorInstances[ctorInstances.length - 1]) {
        ctorInstances[ctorInstances.length - 1]!.onclick = handler
      }
    },
    get onclick() {
      return ctorInstances[ctorInstances.length - 1]?.onclick ?? null
    },
  }
} as unknown as typeof Notification & {
  instances: FakeNotificationRecord[]
  behavior: FakeCtor['behavior']
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

Object.defineProperty(FakeNotification, 'permission', {
  get: () => currentPermission,
})

const installFakeWindow = (options: {
  notification?: typeof Notification
  isSecureContext?: boolean
}) => {
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()
  vi.stubGlobal('window', {
    isSecureContext: options.isSecureContext ?? true,
    ...(options.notification ? { Notification: options.notification } : {}),
    addEventListener,
    removeEventListener,
  })
  return { addEventListener, removeEventListener }
}

beforeEach(() => {
  currentPermission = 'default'
  ctorBehavior = 'store'
  requestPermissionImpl = null
  ctorInstances = []
  FakeNotification.addEventListener = vi.fn()
  FakeNotification.removeEventListener = vi.fn()
  FakeNotification.requestPermission = vi.fn(() =>
    requestPermissionImpl
      ? requestPermissionImpl()
      : Promise.resolve(currentPermission as NotificationPermission),
  ) as unknown as typeof FakeNotification.requestPermission
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const callRequestPermissionByCallback = () => {
  // 旧 WebKit：形参 1 个（回调式）。函数带 1 个形参 → 本次实现走回调分支。
  const callbackStyleRequest = function (onReady: (permission: string) => void) {
    queueMicrotask(() => onReady(currentPermission === 'granted' ? 'granted' : 'denied'))
  }
  FakeNotification.requestPermission =
    callbackStyleRequest as unknown as typeof FakeNotification.requestPermission
}

describe('getWebNotificationSupport', () => {
  it('没有 window / Notification / 非安全上下文 → unsupported', () => {
    expect(getWebNotificationSupport()).toBe('unsupported')

    installFakeWindow({})
    expect(getWebNotificationSupport()).toBe('unsupported')

    installFakeWindow({ notification: FakeNotification, isSecureContext: false })
    expect(getWebNotificationSupport()).toBe('unsupported')
  })

  it('permission 三态直接映射', () => {
    installFakeWindow({ notification: FakeNotification })
    expect(getWebNotificationSupport()).toBe('default')
    currentPermission = 'granted'
    expect(getWebNotificationSupport()).toBe('granted')
    currentPermission = 'denied'
    expect(getWebNotificationSupport()).toBe('denied')
  })
})

describe('requestWebNotificationPermission', () => {
  it('unsupported 时不触碰 API 直接返回', async () => {
    expect(await requestWebNotificationPermission()).toBe('unsupported')
  })

  it('Promise 式 requestPermission 后读取最新 permission', async () => {
    installFakeWindow({ notification: FakeNotification })
    requestPermissionImpl = async () => {
      currentPermission = 'granted'
      return 'granted'
    }
    expect(await requestWebNotificationPermission()).toBe('granted')
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('回调式 requestPermission（旧 Safari/WebKit）兼容', async () => {
    installFakeWindow({ notification: FakeNotification })
    currentPermission = 'granted'
    callRequestPermissionByCallback()
    expect(await requestWebNotificationPermission()).toBe('granted')
  })

  it('requestPermission 抛错时不冒泡，回落当前 permission', async () => {
    installFakeWindow({ notification: FakeNotification })
    FakeNotification.requestPermission = vi.fn(async () => {
      throw new Error('gesture required')
    }) as unknown as typeof FakeNotification.requestPermission
    expect(await requestWebNotificationPermission()).toBe('default')
  })
})

describe('showWebNotification', () => {
  it('未授权 / 不支持时不构造通知，返回 false', async () => {
    installFakeWindow({ notification: FakeNotification })
    expect(await showWebNotification({ title: 'hi' })).toBe(false)

    currentPermission = 'denied'
    expect(await showWebNotification({ title: 'hi' })).toBe(false)
    expect(ctorInstances).toHaveLength(0)
  })

  it('granted 时构造通知并带上文案', async () => {
    installFakeWindow({ notification: FakeNotification })
    currentPermission = 'granted'
    const onClick = vi.fn()
    expect(
      await showWebNotification({
        title: 'Studio 生成完成',
        body: '思维导图已生成完成',
        tag: 'gonotelm:studio:task-1',
        onClick,
      }),
    ).toBe(true)
    const record = ctorInstances[0]
    expect(record?.title).toBe('Studio 生成完成')
    expect(record?.body).toBe('思维导图已生成完成')
    expect(record?.tag).toBe('gonotelm:studio:task-1')
    record?.onclick?.()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('构造器抛错（Firefox Android）走 Service Worker 兜底', async () => {
    ctorBehavior = 'throw'
    installFakeWindow({ notification: FakeNotification })
    currentPermission = 'granted'

    const registration = { showNotification: vi.fn(async () => undefined) }
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn(async () => registration) } })

    expect(await showWebNotification({ title: 'a', body: 'b' })).toBe(true)
    expect(registration.showNotification).toHaveBeenCalledWith('a', {
      body: 'b',
      tag: undefined,
      icon: '/favicon.png',
    })
  })

  it('兜底再失败返回 false', async () => {
    ctorBehavior = 'throw'
    installFakeWindow({ notification: FakeNotification })
    currentPermission = 'granted'
    vi.stubGlobal('navigator', { serviceWorker: undefined })

    expect(await showWebNotification({ title: 'a' })).toBe(false)
  })
})

describe('subscribeWebNotificationPermissionChange', () => {
  it('订阅时先回调当前状态，未支持环境也不报错', () => {
    expect(getWebNotificationSupport()).toBe('unsupported')
    const listener = vi.fn()
    const unsubscribe = subscribeWebNotificationPermissionChange(listener)
    expect(listener).toHaveBeenCalledWith('unsupported')
    unsubscribe()
  })

  it('浏览器支持时注册 permissionchange，退订能解绑', () => {
    const { addEventListener, removeEventListener } = installFakeWindow({
      notification: FakeNotification,
    })
    currentPermission = 'granted'
    const listener = vi.fn()
    const unsubscribe = subscribeWebNotificationPermissionChange(listener)
    expect(listener).toHaveBeenCalledWith('granted')
    expect(FakeNotification.addEventListener).toHaveBeenCalledWith(
      'permissionchange',
      expect.any(Function),
    )
    expect(addEventListener).toHaveBeenCalledWith('focus', expect.any(Function))

    unsubscribe()
    expect(FakeNotification.removeEventListener).toHaveBeenCalled()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
