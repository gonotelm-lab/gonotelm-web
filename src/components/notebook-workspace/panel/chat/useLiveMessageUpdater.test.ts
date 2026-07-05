import { describe, expect, it } from 'vitest'
import type { ChatUiMessage } from './types'

const remapLiveMessage = (
  previous: ChatUiMessage[],
  messageId: string,
  nextMessage: ChatUiMessage,
): ChatUiMessage[] => {
  const targetIndex = previous.findIndex(
    (message) =>
      message.id === messageId || (nextMessage.id.length > 0 && message.id === nextMessage.id),
  )
  if (targetIndex === -1) {
    return previous
  }

  return previous.map((message, index) => (index === targetIndex ? nextMessage : message))
}

describe('live message id remapping', () => {
  it('keeps updating after assistant message id changes from local draft to server id', () => {
    const localId = 'local-assistant-1'
    const serverId = 'server-assistant-1'

    let liveMessages: ChatUiMessage[] = [
      {
        id: localId,
        role: 'assistant',
        fragments: [],
        citations: [],
      },
    ]

    liveMessages = remapLiveMessage(liveMessages, localId, {
      id: serverId,
      role: 'assistant',
      fragments: [],
      citations: [],
    })
    expect(liveMessages[0]?.id).toBe(serverId)

    liveMessages = remapLiveMessage(liveMessages, serverId, {
      id: serverId,
      role: 'assistant',
      fragments: [
        {
          id: 1,
          type: 'PHASE',
          phase: { summary: '检索证据', thought: 'detail' },
        },
      ],
      citations: [],
    })

    expect(liveMessages[0]?.fragments).toHaveLength(1)
    expect(liveMessages[0]?.fragments[0]?.phase?.summary).toBe('检索证据')
  })
})
