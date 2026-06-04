import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/http'
import { setMockScenario } from '@/test/mocks'
import {
  generateStudioArtifact,
  getStudioArtifactResult,
  getStudioArtifactStatus,
  listNotebookStudioArtifacts,
} from './studio'

describe('studio api with msw mock', () => {
  it('submits task and retrieves final artifact content', async () => {
    const submitResp = await generateStudioArtifact({
      notebook_id: 'notebook-1',
      kind: 'mindmap',
      source_ids: ['source-1', 'source-2'],
    })
    expect(submitResp.task_id).toMatch(/^task-/)

    const statusResp = await getStudioArtifactStatus(submitResp.task_id)
    expect(statusResp.status).toBe('completed')

    const resultResp = await getStudioArtifactResult(submitResp.task_id)
    expect(resultResp.status).toBe('completed')
    expect(resultResp.content_kind).toBe('inline')
    expect(resultResp.content).toContain('```mermaid')
    expect(resultResp.content).toContain('来源数量 2')
  })

  it('returns empty artifact list under empty scenario', async () => {
    setMockScenario('studio', 'empty')

    const result = await listNotebookStudioArtifacts('notebook-1')
    expect(result.artifacts).toHaveLength(0)
  })

  it('throws ApiError for server-error and timeout scenarios', async () => {
    setMockScenario('studio', 'server-error')
    await expect(
      generateStudioArtifact({
        notebook_id: 'notebook-1',
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
