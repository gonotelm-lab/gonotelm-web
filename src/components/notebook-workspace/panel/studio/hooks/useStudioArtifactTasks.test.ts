import { createElement, useEffect } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { LOCAL_PREFERENCES_STORAGE_KEY } from '@/lib/localPreferences'
import { useStudioArtifactTasks } from './useStudioArtifactTasks'

const studioApiMocks = vi.hoisted(() => ({
  cancelStudioArtifactTask: vi.fn(async () => null),
  convertNoteToSource: vi.fn(async () => ({ source_id: 'source-1' })),
  deleteStudioArtifact: vi.fn(async () => null),
  generateStudioArtifact: vi.fn(async () => ({ task_id: 'task-1' })),
  getStudioArtifact: vi.fn(),
  getStudioArtifactStatus: vi.fn(),
  listNotebookStudioArtifacts: vi.fn(),
  retryStudioArtifactTask: vi.fn(async () => null),
  updateStudioArtifact: vi.fn(async () => null),
}))

vi.mock('@/api/studio', () => studioApiMocks)

// 通知链路 mock 到最下层的 webNotifications：偏好闸门（completionNotification）保持真实路径。
const completionMocks = vi.hoisted(() => ({
  showWebNotification: vi.fn(async () => true),
}))
vi.mock('@/lib/webNotifications', () => completionMocks)

type StudioTasksState = ReturnType<typeof useStudioArtifactTasks>

let latestState: StudioTasksState | null = null

function Harness() {
  const state = useStudioArtifactTasks({ notebookId: 'notebook-1' })
  useEffect(() => {
    latestState = state
  }, [state])
  return null
}

describe('useStudioArtifactTasks poll timestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    latestState = null
    studioApiMocks.generateStudioArtifact.mockResolvedValue({ task_id: 'task-1' })
    studioApiMocks.listNotebookStudioArtifacts.mockResolvedValue({
      artifacts: [],
      limit: 50,
      offset: 0,
      has_more: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates the item time from the status poll timestamp', async () => {
    let renderer = null as unknown as ReactTestRenderer
    await act(async () => {
      renderer = create(createElement(Harness))
    })

    studioApiMocks.getStudioArtifactStatus.mockResolvedValue({
      task_id: 'task-1',
      status: 'running',
      timestamp: 1_700_000_000_000,
    })

    await act(async () => {
      await latestState?.submitArtifactTask({
        kind: 'mindmap',
        sourceIds: [],
        title: 'Mind Map',
        actionId: 'generate-mindmap',
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(studioApiMocks.getStudioArtifactStatus).toHaveBeenCalledWith('task-1')
    expect(latestState?.artifactItems[0]?.createdAt).toBe(1_700_000_000_000)

    studioApiMocks.getStudioArtifactStatus.mockResolvedValue({
      task_id: 'task-1',
      status: 'running',
      timestamp: 1_700_000_060_000,
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(latestState?.artifactItems[0]?.createdAt).toBe(1_700_000_060_000)

    renderer.unmount()
  })

  it('refreshes the polling item even when the status timestamp is unchanged', async () => {
    let renderer = null as unknown as ReactTestRenderer
    await act(async () => {
      renderer = create(createElement(Harness))
    })

    studioApiMocks.getStudioArtifactStatus.mockResolvedValue({
      task_id: 'task-1',
      status: 'running',
      timestamp: 1_700_000_000_000,
    })

    await act(async () => {
      await latestState?.submitArtifactTask({
        kind: 'mindmap',
        sourceIds: [],
        title: 'Mind Map',
        actionId: 'generate-mindmap',
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    const firstItem = latestState?.artifactItems[0]
    expect(firstItem?.createdAt).toBe(1_700_000_000_000)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    const secondItem = latestState?.artifactItems[0]
    expect(secondItem?.createdAt).toBe(1_700_000_000_000)
    // A new object reference is required for the memoized list item to re-render
    // and recompute the relative time while the task keeps polling.
    expect(secondItem).not.toBe(firstItem)

    renderer.unmount()
  })
})

describe('useStudioArtifactTasks completion notification', () => {
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

  const render = async () => {
    let renderer: ReactTestRenderer | null = null
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    return renderer!
  }

  const runTaskToCompletion = async (renderer: ReactTestRenderer) => {
    studioApiMocks.getStudioArtifactStatus.mockResolvedValue({
      task_id: 'task-1',
      status: 'completed',
      timestamp: 1_700_000_000_000,
    })
    studioApiMocks.getStudioArtifact.mockResolvedValue({
      task_id: 'task-1',
      status: 'completed',
      kind: 'mindmap',
      title: 'Mind Map',
      content: 'demo',
      timestamp: 1_700_000_000_000,
    })
    await act(async () => {
      await latestState?.submitArtifactTask({
        kind: 'mindmap',
        sourceIds: [],
        title: 'Mind Map',
        actionId: 'generate-mindmap',
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    renderer.unmount()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    latestState = null
    completionMocks.showWebNotification.mockClear()
    studioApiMocks.generateStudioArtifact.mockResolvedValue({ task_id: 'task-1' })
    studioApiMocks.listNotebookStudioArtifacts.mockResolvedValue({
      artifacts: [],
      limit: 50,
      offset: 0,
      has_more: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('偏好开启时：生成完成发通知（文案含产物标题，tag 绑 taskId）', async () => {
    const store = createMemoryStorage()
    store.setItem(
      LOCAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ notifications: { taskCompleted: true } }),
    )
    vi.stubGlobal('localStorage', store)

    const renderer = await render()
    await runTaskToCompletion(renderer)

    expect(completionMocks.showWebNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: i18n.t('studio:notification.completedTitle', {
          kind: i18n.t('studio:kind.mindmap'),
        }),
        body: expect.stringContaining('Mind Map'),
        tag: 'gonotelm:task:task-1',
      }),
    )
  })

  it('偏好关闭时不发通知', async () => {
    const store = createMemoryStorage()
    store.setItem(
      LOCAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ notifications: { taskCompleted: false } }),
    )
    vi.stubGlobal('localStorage', store)

    const renderer = await render()
    await runTaskToCompletion(renderer)

    expect(completionMocks.showWebNotification).not.toHaveBeenCalled()
  })
})
