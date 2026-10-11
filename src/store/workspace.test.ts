import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore, type SourceCard } from './workspace'

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
