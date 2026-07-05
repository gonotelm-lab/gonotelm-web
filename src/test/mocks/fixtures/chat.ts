import type {
  ChatCreateMessageResponse,
  ChatListMessagesResponse,
  ChatMessage,
} from '@/types/api'

export const createChatMessageFixture = (
  overrides: Partial<ChatMessage> = {},
): ChatMessage => ({
  id: 'message-1',
  create_time: Date.now(),
  update_time: Date.now(),
  chat_id: 'chat-1',
  user_id: 'user-1',
  role: 'assistant',
  seq_no: 1,
  fragments: [
    {
      id: 1,
      type: 'RESPONSE',
      response: {
        status: 'FINISHED',
        content: {
          type: 'text',
          text: { content: 'Rust 的所有权让内存安全无需 GC。' },
        },
      },
    },
  ],
  citations: [],
  ...overrides,
})

export const createChatListMessagesResponseFixture = (
  messages: ChatMessage[],
): ChatListMessagesResponse => ({
  messages,
  limit: 20,
  has_more: false,
  next_cursor: 0,
})

export const createChatCreateMessageResponseFixture = (
  overrides: Partial<ChatCreateMessageResponse> = {},
): ChatCreateMessageResponse => ({
  msg_id: 'msg-1',
  task_id: 'task-1',
  ...overrides,
})
