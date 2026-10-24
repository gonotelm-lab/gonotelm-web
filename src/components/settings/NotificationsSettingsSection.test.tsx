import { StrictMode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { LOCAL_PREFERENCES_STORAGE_KEY } from '@/lib/localPreferences'
import { NotificationsSettingsSection } from './NotificationsSettingsSection'

type NotificationPermissionLike = 'default' | 'denied' | 'granted'

const buildFakeNotificationCtor = () => {
  let permission: NotificationPermissionLike = 'default'
  let requestPermissionImpl: (() => Promise<NotificationPermissionLike>) | null = null
  const ctor = vi.fn(() => ({})) as unknown as typeof Notification & {
    __setPermission: (next: NotificationPermissionLike) => void
    __stubRequestPermission: (
      impl: (() => Promise<NotificationPermissionLike>) | null,
    ) => void
    __requestPermission: ReturnType<typeof vi.fn>
  }
  Object.defineProperty(ctor, 'permission', {
    get: () => permission,
  })
  ctor.__setPermission = (next) => {
    permission = next
  }
  ctor.__stubRequestPermission = (impl) => {
    requestPermissionImpl = impl
  }
  ctor.__requestPermission = vi.fn(
    () => (requestPermissionImpl ? requestPermissionImpl() : Promise.resolve(permission)),
  )
  ctor.requestPermission = ctor.__requestPermission as unknown as typeof Notification.requestPermission
  return ctor
}

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

const STORAGE = createMemoryStorage()

const renderSection = async () => {
  let renderer: ReactTestRenderer | null = null
  await act(async () => {
    renderer = create(
      <StrictMode>
        <NotificationsSettingsSection />
      </StrictMode>,
    )
  })
  return renderer!
}

const findSwitch = (renderer: ReactTestRenderer): ReactTestInstance =>
  renderer.root.findAll((node) => node.props['data-testid'] === 'settings-notifications-switch')[0]

const findPermissionStatus = (renderer: ReactTestRenderer): ReactTestInstance =>
  renderer.root.findAll(
    (node) => node.props['data-testid'] === 'settings-notifications-permission-status',
  )[0]

const storedPrefs = () => JSON.parse(STORAGE.getItem(LOCAL_PREFERENCES_STORAGE_KEY) ?? '{}')

/** node 环境没有 window / document，「Notification in window」判定需要最小 stub。 */
const installWindow = (notification?: unknown) => {
  vi.stubGlobal('window', {
    isSecureContext: true,
    ...(notification ? { Notification: notification } : {}),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

beforeEach(() => {
  vi.stubGlobal('localStorage', STORAGE)
  STORAGE.removeItem(LOCAL_PREFERENCES_STORAGE_KEY)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('NotificationsSettingsSection', () => {
  it('浏览器不支持通知：开关禁用，显示不支持提示；开关默认关闭', async () => {
    installWindow()
    const renderer = await renderSection()
    const sw = findSwitch(renderer)
    expect(sw.props.checked).toBe(false)
    expect(sw.props.disabled).toBe(true)
    expect(findPermissionStatus(renderer).props.children).toBe(
      i18n.t('settings:notifications.unsupported'),
    )
  })

  it('已授权（granted）：开关可用；打开/关闭把偏好写进 storage', async () => {
    const ctor = buildFakeNotificationCtor()
    ctor.__setPermission('granted')
    installWindow(ctor)
    const renderer = await renderSection()

    const sw = findSwitch(renderer)
    expect(sw.props.checked).toBe(false)
    expect(sw.props.disabled).toBe(false)
    expect(findPermissionStatus(renderer).props.children).toBe(
      i18n.t('settings:notifications.granted'),
    )

    await act(async () => {
      await sw.props.onChange?.(null, true)
    })
    expect(findSwitch(renderer).props.checked).toBe(true)
    expect(storedPrefs().notifications.taskCompleted).toBe(true)

    await act(async () => {
      await sw.props.onChange?.(null, false)
    })
    expect(findSwitch(renderer).props.checked).toBe(false)
    expect(storedPrefs().notifications.taskCompleted).toBe(false)
    renderer.unmount()
  })

  it('未授权（default）：打开开关先请求授权，成功后写入偏好', async () => {
    const ctor = buildFakeNotificationCtor()
    ctor.__stubRequestPermission(async () => {
      ctor.__setPermission('granted')
      return 'granted'
    })
    installWindow(ctor)
    const renderer = await renderSection()
    const sw = findSwitch(renderer)

    await act(async () => {
      await sw.props.onChange?.(null, true)
    })
    expect(ctor.__requestPermission).toHaveBeenCalledTimes(1)
    expect(findSwitch(renderer).props.checked).toBe(true)
    expect(storedPrefs().notifications.taskCompleted).toBe(true)
    renderer.unmount()
  })

  it('未授权且被拒绝：开关保持关闭，偏好不写入，状态提示被拒', async () => {
    const ctor = buildFakeNotificationCtor()
    ctor.__stubRequestPermission(async () => {
      ctor.__setPermission('denied')
      return 'denied'
    })
    installWindow(ctor)
    const renderer = await renderSection()
    const sw = findSwitch(renderer)

    await act(async () => {
      await sw.props.onChange?.(null, true)
    })
    expect(ctor.__requestPermission).toHaveBeenCalledTimes(1)
    expect(findSwitch(renderer).props.checked).toBe(false)
    expect(storedPrefs().notifications).toBeUndefined()
    expect(findPermissionStatus(renderer).props.children).toBe(
      i18n.t('settings:notifications.denied'),
    )
    renderer.unmount()
  })

  it('浏览器已禁用（denied）：开关禁用并提供重新检测；检测到恢复后开关重新可用', async () => {
    const ctor = buildFakeNotificationCtor()
    ctor.__setPermission('denied')
    installWindow(ctor)
    const renderer = await renderSection()
    const sw = findSwitch(renderer)
    expect(sw.props.disabled).toBe(true)

    const recheck = renderer.root.findAll(
      (node) => node.props['data-testid'] === 'settings-notifications-recheck',
    )[0]
    expect(recheck).toBeTruthy()

    // 用户在浏览器站点设置里恢复授权后点「重新检测」→ 状态与开关恢复。
    ctor.__setPermission('granted')
    await act(async () => {
      await recheck.props.onClick?.()
    })
    expect(findSwitch(renderer).props.disabled).toBe(false)
    expect(findPermissionStatus(renderer).props.children).toBe(
      i18n.t('settings:notifications.granted'),
    )
    renderer.unmount()
  })
})
