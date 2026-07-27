import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/http'
import { setMockScenario } from '@/test/mocks'
import {
  cancelStudioArtifactTask,
  deleteStudioArtifact,
  generateStudioArtifact,
  getStudioArtifact,
  getStudioArtifactStatus,
  listNotebookStudioArtifacts,
  retryStudioArtifactTask,
} from './studio'

describe('studio api with msw mock', () => {
  it('submits task and retrieves final artifact content', async () => {
    const submitResp = await generateStudioArtifact('notebook-1', {
      kind: 'mindmap',
      source_ids: ['source-1', 'source-2'],
    })
    expect(submitResp.task_id).toMatch(/^task-/)

    const statusResp = await getStudioArtifactStatus(submitResp.task_id)
    expect(statusResp.status).toBe('completed')

    const resultResp = await getStudioArtifact(submitResp.task_id)
    expect(resultResp.status).toBe('completed')
    expect(resultResp.kind).toBe('mindmap')
    expect(resultResp.content_kind).toBe('inline')
    expect(resultResp.content).toContain('```mermaid')
    expect(resultResp.content).toContain('来源数量 2')
  })

  it('returns empty artifact list under empty scenario', async () => {
    setMockScenario('studio', 'empty')

    const result = await listNotebookStudioArtifacts('notebook-1')
    expect(result.artifacts).toHaveLength(0)
  })

  it('supports retry, cancel and delete actions', async () => {
    const submitResp = await generateStudioArtifact('notebook-1', {
      kind: 'mindmap',
      source_ids: ['source-1'],
    })

    await retryStudioArtifactTask(submitResp.task_id)
    const retryStatus = await getStudioArtifactStatus(submitResp.task_id)
    expect(retryStatus.status).toBe('running')

    await cancelStudioArtifactTask(submitResp.task_id)
    const cancelStatus = await getStudioArtifactStatus(submitResp.task_id)
    expect(cancelStatus.status).toBe('cancelled')

    await deleteStudioArtifact(submitResp.task_id)
  })

  it('supports submitting audio_overview task payload', async () => {
    const submitResp = await generateStudioArtifact('notebook-1', {
      kind: 'audio_overview',
      source_ids: ['source-1'],
      audio_overview: {
        language: 'zh-cn(简体中文)',
        style: 'abstract',
      },
    })

    expect(submitResp.task_id).toMatch(/^task-/)
  })

  it('throws ApiError for server-error and timeout scenarios', async () => {
    setMockScenario('studio', 'server-error')
    await expect(
      generateStudioArtifact('notebook-1', {
        kind: 'mindmap',
        source_ids: ['source-1'],
      }),
    ).rejects.toBeInstanceOf(ApiError)

    setMockScenario('studio', 'timeout')
    await expect(
      getStudioArtifactStatus('task-timeout'),
    ).rejects.toMatchObject({
      status: 504,
      code: 504_001,
    })
  })
})
