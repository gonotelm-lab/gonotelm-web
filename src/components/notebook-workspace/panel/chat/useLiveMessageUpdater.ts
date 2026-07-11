import { useCallback } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { streamAutoScrollThresholdPx } from './chatConversationCommon'
import type { ChatUiMessage } from './types'

interface UseLiveMessageUpdaterParams {
  messageListRef: RefObject<HTMLDivElement | null>
  setLiveMessages: Dispatch<SetStateAction<ChatUiMessage[]>>
}

const buildLiveMessageFingerprint = (message: ChatUiMessage) =>
  [
    message.id,
    message.fragments.length,
    message.citations.map((citation) => `${citation.docId}:${citation.sourceId}`).join(','),
    message.fragments
      .map((fragment) => {
        if (fragment.type === 'THINK') {
          return `T:${fragment.think?.status ?? ''}:${fragment.think?.content?.length ?? 0}`
        }
        if (fragment.type === 'RESPONSE') {
          return `R:${fragment.response?.status ?? ''}:${fragment.response?.content?.length ?? 0}`
        }
        if (fragment.type === 'PHASE') {
          return `P:${fragment.phase?.summary ?? ''}:${fragment.phase?.thought?.length ?? 0}`
        }
        return String(fragment.type)
      })
      .join('|'),
  ].join('#')

export const findLiveMessageIndex = (
  previous: ChatUiMessage[],
  messageId: string,
  nextMessage: ChatUiMessage,
) =>
  previous.findIndex(
    (message) =>
      message.id === messageId ||
      message.clientKey === messageId ||
      (nextMessage.clientKey && message.clientKey === nextMessage.clientKey) ||
      (nextMessage.id.length > 0 && message.id === nextMessage.id),
  )

export function useLiveMessageUpdater({
  messageListRef,
  setLiveMessages,
}: UseLiveMessageUpdaterParams) {
  const updateLiveMessage = useCallback(
    (messageId: string, nextMessage: ChatUiMessage) => {
      const container = messageListRef.current
      const shouldStickToBottom = Boolean(
        container &&
          container.scrollHeight - container.scrollTop - container.clientHeight <
            streamAutoScrollThresholdPx,
      )
      const nextFingerprint = buildLiveMessageFingerprint(nextMessage)

      setLiveMessages((previous) => {
        const targetIndex = findLiveMessageIndex(previous, messageId, nextMessage)
        if (targetIndex === -1) {
          return previous
        }

        const currentFingerprint = buildLiveMessageFingerprint(previous[targetIndex]!)
        if (currentFingerprint === nextFingerprint) {
          return previous
        }

        return previous.map((message, index) =>
          index === targetIndex ? nextMessage : message,
        )
      })

      if (shouldStickToBottom) {
        window.requestAnimationFrame(() => {
          const currentContainer = messageListRef.current
          if (!currentContainer) return
          currentContainer.scrollTop = currentContainer.scrollHeight
        })
      }
    },
    [messageListRef, setLiveMessages],
  )

  return { updateLiveMessage }
}
