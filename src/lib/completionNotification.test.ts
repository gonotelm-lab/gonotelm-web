import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { notifyTaskCompleted } from './completionNotification'
import { LOCAL_PREFERENCES_STORAGE_KEY } from './localPreferences'

const webNotificationMocks = vi.hoisted(() => ({
  showWebNotification: vi.fn(async () => true),
}))

vi.mock('./webNotifications', () => webNotificationMocks)

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

const setTaskCompletedPref = (enabled: boolean) => {
  STORAGE.setItem(
    LOCAL_PREFERENCES_STORAGE_KEY,
    JSON.stringify({ notifications: { taskCompleted: enabled } }),
  )
}

beforeEach(() => {
  vi.stubGlobal('localStorage', STORAGE)
  STORAGE.removeItem(LOCAL_PREFERENCES_STORAGE_KEY)
  webNotificationMocks.showWebNotification.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('notifyTaskCompleted', () => {
  it('granted 时发送通知：标题走 i18n key，tag 绑 taskId', async () => {
    setTaskCompletedPref(true)
    expect(
      await notifyTaskCompleted({
        titleKey: 'studio:notification.completedTitle',
        body: '"demo.pdf" is ready',
        taskId: 'task-1',
      }),
    ).toBe(true)

    expect(webNotificationMocks.showWebNotification).toHaveBeenCalledWith({
      title: i18n.t('studio:notification.completedTitle'),
      body: '"demo.pdf" is ready',
      tag: 'gonotelm:task:task-1',
      onClick: expect.any(Function),
    })
  })

  it('标题插值参数透传给通知', async () => {
    setTaskCompletedPref(true)
    await notifyTaskCompleted({
      titleKey: 'studio:notification.completedTitle',
      titleValues: { kind: '视频概览' },
      body: '「demo」已生成完成',
      taskId: 'task-1',
    })
    expect(webNotificationMocks.showWebNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: i18n.t('studio:notification.completedTitle', { kind: '视频概览' }),
      }),
    )
  })

  it('无 taskId 时不写 tag', async () => {
    setTaskCompletedPref(true)
    await notifyTaskCompleted({
      titleKey: 'sources:notification.completedTitle',
      body: 'ready',
    })
    expect(webNotificationMocks.showWebNotification).toHaveBeenCalledWith(
      expect.objectContaining({ tag: undefined }),
    )
  })

  it('偏好关闭时不发送', async () => {
    setTaskCompletedPref(false)
    expect(
      await notifyTaskCompleted({
        titleKey: 'sources:notification.completedTitle',
        body: 'ready',
      }),
    ).toBe(false)
    expect(webNotificationMocks.showWebNotification).not.toHaveBeenCalled()
  })

  it('浏览器拒绝/不支持（showWebNotification 返回 false）时不抛错', async () => {
    setTaskCompletedPref(true)
    webNotificationMocks.showWebNotification.mockResolvedValueOnce(false)
    expect(
      await notifyTaskCompleted({
        titleKey: 'sources:notification.completedTitle',
        body: 'ready',
      }),
    ).toBe(false)
  })
})
