import { createElement, useState } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceCard } from '@/store/workspace'
import type { SourceStatus } from '@/types/api'
import { useSourcePolling } from './useSourcePolling'

const apiMocks = vi.hoisted(() => ({
  pollSourceStatus: vi.fn(async () => ({ status: 'ready' as SourceStatus })),
}))
vi.mock('@/api/source', () => apiMocks)

// 完成通知在 store 的状态转换汇聚点触发（见 store/sourceCompletionNotification），这里只验证轮询本身。

/** 模拟 store：setSourceStatus 更新列表并触发重渲染（sourcesRef 由 effect 刷新）。 */
let currentSources: SourceCard[] = []

const buildSource = (patch: Partial<SourceCard>): SourceCard =>
  ({ id: 'source-1', status: 'preparing', title: '年度报告.pdf', ...patch }) as SourceCard

const sourceById = (id: string) => currentSources.find((source) => source.id === id)

function Harness() {
  const [, forceUpdate] = useState(0)
  useSourcePolling({
    notebookId: 'nb-1',
    sources: currentSources,
    removingSourceIds: {},
    setSourceStatus: (id, status) => {
      currentSources = currentSources.map((source) =>
        source.id === id ? { ...source, status } : source,
      )
      forceUpdate((n) => n + 1)
    },
  })
  return null
}

const render = async () => {
  let renderer: ReactTestRenderer | null = null
  await act(async () => {
    renderer = create(createElement(Harness))
  })
  return renderer!
}

beforeEach(() => {
  vi.useFakeTimers()
  currentSources = []
  apiMocks.pollSourceStatus.mockClear()
  apiMocks.pollSourceStatus.mockImplementation(async () => ({ status: 'ready' as SourceStatus }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSourcePolling', () => {
  it('轮询到 ready 时把状态写回 store，并且只轮询一次', async () => {
    currentSources = [buildSource({})]
    const renderer = await render()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(apiMocks.pollSourceStatus).toHaveBeenCalledWith('source-1')
    expect(sourceById('source-1')?.status).toBe('ready')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(apiMocks.pollSourceStatus).toHaveBeenCalledTimes(1)

    renderer.unmount()
  })

  it('来源为空或全部终态时不轮询', async () => {
    currentSources = [buildSource({ status: 'ready' })]
    const renderer = await render()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(apiMocks.pollSourceStatus).not.toHaveBeenCalled()
    renderer.unmount()
  })
})
