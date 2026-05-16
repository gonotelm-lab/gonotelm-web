import type {
  ChatCreateMessageResponse,
  ChatListMessagesResponse,
  ChatMessageListItem,
} from '@/types/api'

export const createChatMessageListItemFixture = (
  overrides: Partial<ChatMessageListItem> = {},
): ChatMessageListItem => ({
  id: 'message-1',
  chat_id: 'chat-1',
  role: 'assistant',
  content: {
    created_at: Date.now(),
    kind: 'text',
    text: {
      content: 'Rust 的所有权让内存安全无需 GC。',
    },
  },
  ...overrides,
})

export const createChatListMessagesResponseFixture = (
  messages: ChatMessageListItem[],
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
