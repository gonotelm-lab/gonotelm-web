import { createElement, useEffect } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})
