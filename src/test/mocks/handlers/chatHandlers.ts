import { http } from 'msw'
import {
  createChatCreateMessageResponseFixture,
  createChatListMessagesResponseFixture,
  createChatMessageListItemFixture,
} from '../fixtures/chat'
import { getMockScenario } from '../scenarios'
import { createSuccessResponse, resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

const chatHistoryMessages = [
  createChatMessageListItemFixture({
    id: 'history-u-1',
    role: 'user',
    content: {
      created_at: Date.now() - 2_000,
      kind: 'text',
      text: {
        content: '解释一下 Rust 所有权',
      },
    },
  }),
  createChatMessageListItemFixture({
    id: 'history-a-1',
    role: 'assistant',
    content: {
      created_at: Date.now() - 1_000,
      kind: 'text',
      text: {
        content: '所有权用于在编译期管理资源生命周期。',
      },
    },
  }),
]

export const chatHandlers = [
  http.post(`${apiBaseUrl}/api/v1/chat/:chatId/message/create`, async () => {
    const scenario = getMockScenario('chat')
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
