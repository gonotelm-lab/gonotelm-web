import { http } from 'msw'
import {
  createChatCreateMessageResponseFixture,
  createChatListMessagesResponseFixture,
  createChatMessageFixture,
} from '../fixtures/chat'
import { getMockScenario } from '../scenarios'
import { createErrorResponse, createSuccessResponse, resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'
const validChatStyleSet = new Set(['default', 'analyst', 'guide'])
const validChatAnswerLengthSet = new Set(['default', 'longer', 'shorter'])

const chatHistoryMessages = [
  createChatMessageFixture({
    id: 'history-u-1',
    role: 'user',
    fragments: [
      {
        id: 1,
        type: 'REQUEST',
        request: {
          content: { type: 'text', text: { content: '解释一下 Rust 所有权' } },
        },
      },
    ],
  }),
  createChatMessageFixture({
    id: 'history-a-1',
    role: 'assistant',
    fragments: [
      {
        id: 1,
        type: 'RESPONSE',
        response: {
          status: 'FINISHED',
          content: {
            type: 'text',
            text: { content: '所有权用于在编译期管理资源生命周期。' },
          },
        },
      },
    ],
  }),
]

export const chatHandlers = [
  http.post(`${apiBaseUrl}/api/v1/chat/:chatId/message/create`, async ({ request }) => {
    const scenario = getMockScenario('chat')
    if (scenario === 'success' || scenario === 'empty') {
      const requestBody = (await request.json().catch(() => ({}))) as Record<string, unknown>
      if (
        typeof requestBody.style !== 'undefined' &&
        (typeof requestBody.style !== 'string' || !validChatStyleSet.has(requestBody.style))
      ) {
        return createErrorResponse(200, 'invalid chat style', 1000)
      }
      if (
        typeof requestBody.answer_length !== 'undefined' &&
        (typeof requestBody.answer_length !== 'string' ||
          !validChatAnswerLengthSet.has(requestBody.answer_length))
      ) {
        return createErrorResponse(200, 'invalid chat answer_length', 1000)
      }
    }

    return resolveScenarioResponse({
      scenario,
      successData: createChatCreateMessageResponseFixture({
        msg_id: 'msg-created-1',
        task_id: 'task-created-1',
      }),
      emptyData: createChatCreateMessageResponseFixture({
        msg_id: '',
        task_id: '',
      }),
    })
  }),

  http.get(`${apiBaseUrl}/api/v1/chat/:chatId/message/list`, async () => {
    const scenario = getMockScenario('chat')
    return resolveScenarioResponse({
      scenario,
      successData: createChatListMessagesResponseFixture(chatHistoryMessages),
      emptyData: createChatListMessagesResponseFixture([]),
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/chat/:chatId/stream/abort`, async () =>
    createSuccessResponse(null),
  ),
  http.delete(`${apiBaseUrl}/api/v1/chat/:chatId/context`, async () =>
    createSuccessResponse(null),
  ),
]
