import { describe, expect, it } from 'vitest'
import { findLiveMessageIndex } from './useLiveMessageUpdater'
import type { ChatUiMessage } from './types'

describe('findLiveMessageIndex', () => {
  it('matches live draft by stable clientKey after server id is assigned', () => {
    const localId = 'local-assistant-1'
    const serverId = 'server-assistant-1'

    const previous: ChatUiMessage[] = [
      {
        id: localId,
        clientKey: localId,
        role: 'assistant',
        fragments: [],
        citations: [],
      },
    ]

    const nextMessage: ChatUiMessage = {
      id: serverId,
      clientKey: localId,
      role: 'assistant',
      fragments: [
        {
          id: 1,
          type: 'PHASE',
          phase: { summary: '检索证据', thought: 'detail' },
        },
      ],
      citations: [],
    }

    expect(findLiveMessageIndex(previous, localId, nextMessage)).toBe(0)
    expect(findLiveMessageIndex(previous, serverId, nextMessage)).toBe(0)
  })
})
