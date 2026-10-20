import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/http'
import {
  apiErrorToastStore,
  resetApiErrorToastForTest,
} from '@/lib/apiErrorToast'
import { mockServer } from '@/test/mocks'
import {
  createChatMessage,
  getChatRunningTask,
  getChatSuggestions,
  listChatMessages,
  streamChatEvents,
} from './chat'
import { setMockScenario } from '@/test/mocks'

describe('chat api with msw mock', () => {
  beforeEach(() => {
    resetApiErrorToastForTest()
  })

  it('creates chat message task using mocked endpoint', async () => {
    const result = await createChatMessage({
      id: 'chat-1',
      prompt: ' explain ownership ',
      source_ids: ['source-1'],
      enable_thinking: true,
      style: 'analyst',
      answer_length: 'longer',
    })

    expect(result.task_id).toBe('task-created-1')
    expect(result.msg_id).toBe('msg-created-1')
  })

  it('returns empty message list under empty scenario', async () => {
    setMockScenario('chat', 'empty')

    const result = await listChatMessages({ id: 'chat-1', cursor: 0, limit: 20 })

    expect(result.messages).toEqual([])
  })

  it('throws ApiError for invalid style or answer_length', async () => {
    setMockScenario('chat', 'success')
    await expect(
      createChatMessage({
        id: 'chat-1',
        prompt: 'rust',
        style: 'invalid' as never,
      }),
    ).rejects.toMatchObject({
      status: 200,
      code: 1000,
    })
    await expect(
      createChatMessage({
        id: 'chat-1',
        prompt: 'rust',
        answer_length: 'invalid' as never,
      }),
    ).rejects.toMatchObject({
      status: 200,
      code: 1000,
    })
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

  it('fetches chat suggestions with source ids', async () => {
    const result = await getChatSuggestions({ id: 'chat-1', source_ids: ['source-1', 'source-2'] })

    expect(result.type).toBe('opener')
    expect(result.questions).toHaveLength(3)
  })

  it('serializes source ids as a comma-separated query parameter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await getChatSuggestions({ id: 'chat-1', source_ids: ['source-1', 'source-2'] })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0])
    expect(calledUrl).toContain('/suggestions?source_ids=source-1%2Csource-2')
  })

  it('returns empty questions under empty scenario', async () => {
    setMockScenario('chat', 'empty')

    const result = await getChatSuggestions({ id: 'chat-1', source_ids: ['source-1'] })

    expect(result.questions).toEqual([])
  })

  it('SSE 接口失败也走统一错误映射', async () => {
    mockServer.use(
      http.get(
        'http://127.0.0.1:4173/api/v1/chats/:chatId/stream',
        () =>
          HttpResponse.json(
            { code: -998, msg: 'INNER_ERROR', data: null },
            { status: 500 },
          ),
      ),
    )

    await expect(
      streamChatEvents({
        id: 'chat-1',
        task_id: 'task-1',
        onEvent: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: -998, status: 500 })
    expect(apiErrorToastStore.getSnapshot()?.messageKey).toBe('apiError.server')
  })

  it('reports task-not-running end status when task already finished', async () => {
    setMockScenario('chat', 'empty')

    const onEvent = vi.fn()
    const endStatus = await streamChatEvents({
      id: 'chat-1',
      task_id: 'task-1',
      onEvent,
    })

    expect(endStatus).toBe('task-not-running')
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('reports eof end status after consuming an sse stream with terminal event', async () => {
    const onEvent = vi.fn()
    const endStatus = await streamChatEvents({
      id: 'chat-1',
      task_id: 'task-1',
      onEvent,
    })

    expect(endStatus).toBe('eof')
    expect(onEvent).toHaveBeenCalledWith('message', expect.objectContaining({ done: true }))
  })

  it('returns empty task_id when no running stream task', async () => {
    const result = await getChatRunningTask('chat-1')
    expect(result.task_id).toBe('')
  })

  it('returns running task_id under resume scenario', async () => {
    setMockScenario('chat', 'resume')
    const result = await getChatRunningTask('chat-1')
    expect(result.task_id).toBe('task-running-1')
  })
})
