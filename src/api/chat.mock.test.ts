import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/http'
import { createChatMessage, listChatMessages } from './chat'
import { setMockScenario } from '@/test/mocks'

describe('chat api with msw mock', () => {
  it('creates chat message task using mocked endpoint', async () => {
    const result = await createChatMessage({
      id: 'chat-1',
      prompt: ' explain ownership ',
      source_ids: ['source-1'],
      enable_thinking: true,
    })

    expect(result.task_id).toBe('task-created-1')
    expect(result.msg_id).toBe('msg-created-1')
  })

  it('returns empty message list under empty scenario', async () => {
    setMockScenario('chat', 'empty')

    const result = await listChatMessages({ id: 'chat-1', cursor: 0, limit: 20 })

    expect(result.messages).toEqual([])
  })

  it('throws ApiError for server error and timeout scenarios', async () => {
    setMockScenario('chat', 'server-error')
    await expect(listChatMessages({ id: 'chat-1' })).rejects.toBeInstanceOf(ApiError)

    setMockScenario('chat', 'timeout')
    await expect(createChatMessage({ id: 'chat-1', prompt: 'rust' })).rejects.toMatchObject({
      status: 504,
      code: 504_001,
    })
  })
})
