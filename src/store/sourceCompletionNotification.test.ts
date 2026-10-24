import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { LOCAL_PREFERENCES_STORAGE_KEY } from '@/lib/localPreferences'
import { notifyReadyTransitions, notifySourceCompleted } from './sourceCompletionNotification'
import type { SourceCard } from './workspace'

const completionMocks = vi.hoisted(() => ({
  notifyTaskCompleted: vi.fn(async () => true),
}))

vi.mock('@/lib/completionNotification', () => completionMocks)

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

const buildSource = (patch: Partial<SourceCard>): SourceCard =>
  ({
    id: 'source-1',
    kind: 'text',
    status: 'preparing',
    title: '年度报告.pdf',
    ...patch,
  }) as SourceCard

beforeEach(() => {
  vi.stubGlobal('localStorage', STORAGE)
  STORAGE.removeItem(LOCAL_PREFERENCES_STORAGE_KEY)
  completionMocks.notifyTaskCompleted.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('notifySourceCompleted', () => {
  it('用来源标题拼文案并带 sourceId 作为 tag', async () => {
    await notifySourceCompleted({ source: buildSource({}) })
    expect(completionMocks.notifyTaskCompleted).toHaveBeenCalledWith({
      titleKey: 'sources:notification.completedTitle',
      body: i18n.t('sources:notification.completedBody', { title: '年度报告.pdf' }),
      taskId: 'source-1',
    })
  })

  it('标题为空时回落到「未命名来源」', async () => {
    await notifySourceCompleted({ source: buildSource({ title: '   ' }) })
    expect(completionMocks.notifyTaskCompleted).toHaveBeenCalledWith({
      titleKey: 'sources:notification.completedTitle',
      body: i18n.t('sources:notification.completedBody', {
        title: i18n.t('sources:notification.untitled'),
      }),
      taskId: 'source-1',
    })
  })
})

describe('notifyReadyTransitions', () => {
  beforeEach(() => {
    completionMocks.notifyTaskCompleted.mockClear()
  })

  it('已知卡片从非 ready 到 ready 时通知，首见/重复 ready 不通知', async () => {
    const before = [buildSource({ id: 's1', status: 'preparing' }), buildSource({ id: 's2', status: 'ready' })]
    notifyReadyTransitions(before, [
      buildSource({ id: 's1', status: 'ready' }),
      buildSource({ id: 's2', status: 'ready' }),
      buildSource({ id: 's3', status: 'ready' }),
    ])
    expect(completionMocks.notifyTaskCompleted).toHaveBeenCalledTimes(1)
    expect(completionMocks.notifyTaskCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 's1' }),
    )
  })
})
