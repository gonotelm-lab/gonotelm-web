import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/http'
import { createSource, getSourceParsedTree, pollSourceStatus } from './source'
import { setMockScenario } from '@/test/mocks'

describe('source api with msw mock', () => {
  it('creates source and polls status without backend dependency', async () => {
    const created = await createSource({
      notebook_id: 'notebook-1',
      kind: 'text',
      text: 'Ownership note',
    })

    const status = await pollSourceStatus(created.id)

    expect(created.id).toBeTruthy()
    expect(status.status).toBe('ready')
  })

  it('supports empty scenario for status polling', async () => {
    setMockScenario('source', 'empty')

    const status = await pollSourceStatus('source-1')

    expect(status.status).toBe('failed')
  })

  it('loads parsed tree data from source api', async () => {
    const tree = await getSourceParsedTree('source-1')

    expect(tree.height).toBeGreaterThanOrEqual(0)
    expect(tree.root?.content).toBeTruthy()
  })

  it('throws ApiError for server error and timeout scenarios', async () => {
    setMockScenario('source', 'server-error')
    await expect(createSource({ notebook_id: 'notebook-1', kind: 'text' })).rejects.toBeInstanceOf(
      ApiError,
    )

    setMockScenario('source', 'timeout')
    await expect(pollSourceStatus('source-1')).rejects.toMatchObject({
      status: 504,
      code: 504_001,
    })
  })
})
