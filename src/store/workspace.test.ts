import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { LOCAL_PREFERENCES_STORAGE_KEY } from '@/lib/localPreferences'
import { useWorkspaceStore, type SourceCard } from './workspace'

// 通知链路只 mock 最底层 webNotifications：store 转换检测 → 文案 → 偏好闸门全部保持真实路径。
const notificationMocks = vi.hoisted(() => ({
  showWebNotification: vi.fn(async () => true),
}))
vi.mock('@/lib/webNotifications', () => notificationMocks)

const sourceCard = (overrides: Partial<SourceCard> = {}): SourceCard => ({
  id: 'source-1',
  kind: 'text',
  status: 'ready',
  title: '来源一',
  textContent: 'body',
  ...overrides,
})

const getSources = () => useWorkspaceStore.getState().sources

describe('workspace store — setSources 保持引用相等', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
  })

  it('内容等价的整批刷新不更换数组，也不更换卡片对象', () => {
    useWorkspaceStore.getState().setSources([sourceCard(), sourceCard({ id: 'source-2' })])
    const before = getSources()

    // 模拟轮询重新水合：全新数组 + 全新对象，但字段完全一致
    useWorkspaceStore.getState().setSources([
      { ...sourceCard() },
      { ...sourceCard({ id: 'source-2' }) },
    ])

    const after = getSources()
    expect(after).toBe(before)
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
  })

  it('只有真正变化的卡片换对象，其余保持原引用（父层数组必然更新）', () => {
    useWorkspaceStore.getState().setSources([sourceCard(), sourceCard({ id: 'source-2' })])
    const before = getSources()

    useWorkspaceStore.getState().setSources([
      sourceCard(),
      sourceCard({ id: 'source-2', status: 'failed' }),
    ])

    const after = getSources()
    expect(after).not.toBe(before)
    expect(after[0]).toBe(before[0])
    expect(after[1]).not.toBe(before[1])
    expect(after[1].status).toBe('failed')
  })

  it('顺序变化视为内容变化（行位置会动，不能复用）', () => {
    useWorkspaceStore.getState().setSources([sourceCard(), sourceCard({ id: 'source-2' })])
    const before = getSources()

    useWorkspaceStore.getState().setSources([
      sourceCard({ id: 'source-2' }),
      sourceCard(),
    ])

    const after = getSources()
    expect(after).not.toBe(before)
    expect(after.map((item) => item.id)).toEqual(['source-2', 'source-1'])
  })

  it('数量变化直接采用新数组', () => {
    useWorkspaceStore.getState().setSources([sourceCard()])
    const before = getSources()

    useWorkspaceStore.getState().setSources([sourceCard(), sourceCard({ id: 'source-2' })])

    expect(getSources()).not.toBe(before)
    expect(getSources()).toHaveLength(2)
  })

  it('内容等价时订阅者不会被通知（zustand 在 set 返回原 state 时静默）', () => {
    useWorkspaceStore.getState().setSources([sourceCard()])
    let notifications = 0
    const unsubscribe = useWorkspaceStore.subscribe(() => {
      notifications += 1
    })

    useWorkspaceStore.getState().setSources([{ ...sourceCard() }])

    expect(notifications).toBe(0)
    unsubscribe()
  })
})

describe('workspace store — 来源完成通知（状态转换汇聚点）', () => {
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

  const storage = createMemoryStorage()

  beforeEach(() => {
    storage.setItem(
      LOCAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ notifications: { taskCompleted: true } }),
    )
    vi.stubGlobal('localStorage', storage)
    useWorkspaceStore.getState().reset()
    notificationMocks.showWebNotification.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('setSourceStatus：preparing → ready 触发通知；ready 后不再重复', () => {
    useWorkspaceStore.getState().addSource(sourceCard({ status: 'preparing' }))
    useWorkspaceStore.getState().setSourceStatus('source-1', 'ready')

    expect(notificationMocks.showWebNotification).toHaveBeenCalledTimes(1)
    expect(notificationMocks.showWebNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: i18n.t('sources:notification.completedTitle'),
        body: expect.stringContaining('来源一'),
        tag: 'gonotelm:task:source-1',
      }),
    )

    useWorkspaceStore.getState().setSourceStatus('source-1', 'ready')
    expect(notificationMocks.showWebNotification).toHaveBeenCalledTimes(1)
  })

  it('setSources（水合整批替换）：已知的 preparing 翻成 ready 触发通知', () => {
    useWorkspaceStore.getState().addSource(sourceCard({ status: 'preparing' }))
    useWorkspaceStore.getState().setSources([sourceCard({ status: 'ready' })])

    expect(notificationMocks.showWebNotification).toHaveBeenCalledTimes(1)
  })

  it('首次见到的 ready 来源不通知（初始水合不骚扰）', () => {
    useWorkspaceStore.getState().setSources([sourceCard({ status: 'ready' })])
    expect(notificationMocks.showWebNotification).not.toHaveBeenCalled()
  })

  it('failed 不通知；重试回 preparing 再 ready 时通知', () => {
    useWorkspaceStore.getState().addSource(sourceCard({ status: 'preparing' }))
    useWorkspaceStore.getState().setSourceStatus('source-1', 'failed')
    expect(notificationMocks.showWebNotification).not.toHaveBeenCalled()

    useWorkspaceStore.getState().setSourceStatus('source-1', 'preparing')
    useWorkspaceStore.getState().setSourceStatus('source-1', 'ready')
    expect(notificationMocks.showWebNotification).toHaveBeenCalledTimes(1)
  })

  it('偏好关闭时不发通知', () => {
    storage.setItem(
      LOCAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ notifications: { taskCompleted: false } }),
    )

    useWorkspaceStore.getState().addSource(sourceCard({ status: 'preparing' }))
    useWorkspaceStore.getState().setSourceStatus('source-1', 'ready')

    expect(notificationMocks.showWebNotification).not.toHaveBeenCalled()
  })
})
