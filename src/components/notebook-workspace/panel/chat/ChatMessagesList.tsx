import { memo } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Box, CircularProgress, Stack } from '@mui/material'
import { panelTitleToBodySpacing } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { ChatMessageItem } from './ChatMessageItem'
import type { ChatCitationJumpRequest, ChatUiMessage } from './types'
import { workspaceSpace } from '../../shared/ui/layoutTokens'
import { chatMessageContentTokens } from './layoutTokens'

const messageItemSpacing = chatMessageContentTokens.messageGap
const loadingIndicatorRowMinHeight = 18
const loadingIndicatorSize = 13
const messageListLayoutTokens = {
  marginTop: panelTitleToBodySpacing,
  innerPaddingX: chatMessageContentTokens.scrollInnerPaddingX,
  notebookDividerMarginY: workspaceSpace.lg,
  notebookDividerColor: 'divider',
}

interface ChatMessagesListProps {
  messageListRef: RefObject<HTMLDivElement | null>
  selectedSourceIds: string[]
  notebookInfoHeader?: ReactNode
  messages: ChatUiMessage[]
  isLoadingHistory: boolean
  isFetchingMore: boolean
  isStreaming: boolean
  activeAssistantMessageId: string | null
  copiedUserMessageId: string | null
  savingAsNoteMessageId: string | null
  onScrollTopCheck: () => void
  onCopyUserMessage: (id: string, text: string) => void
  onSaveAsNote?: (messageId: string) => void
  onOpenCitationJump?: (request: ChatCitationJumpRequest) => void
}

/**
 * Owns chat transcript rendering and stream-status presentation.
 * It keeps loading indicators, per-message wrappers,
 * and active-assistant status animation in one scrollable list surface.
 */
export const ChatMessagesList = memo(function ChatMessagesList({
  messageListRef,
  selectedSourceIds,
  notebookInfoHeader,
  messages,
  isLoadingHistory,
  isFetchingMore,
  isStreaming,
  activeAssistantMessageId,
  copiedUserMessageId,
  savingAsNoteMessageId,
  onScrollTopCheck,
  onCopyUserMessage,
  onSaveAsNote,
  onOpenCitationJump,
}: ChatMessagesListProps) {
  return (
    <Stack
      ref={messageListRef}
      className="chat-messages-scroll"
      spacing={0}
      onScroll={onScrollTopCheck}
      sx={(theme) => ({
        mt: messageListLayoutTokens.marginTop,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowAnchor: 'none',
        px: 0,
        ...subtleScrollbarSx(theme),
      })}
    >
      <Box sx={{ px: messageListLayoutTokens.innerPaddingX }}>
        {notebookInfoHeader}

        {notebookInfoHeader ? (
          <Box
            sx={{
              my: messageListLayoutTokens.notebookDividerMarginY,
              borderTop: '1px solid',
              borderColor: messageListLayoutTokens.notebookDividerColor,
            }}
          />
        ) : null}

        <Box
          sx={{
            minHeight: loadingIndicatorRowMinHeight,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isLoadingHistory || isFetchingMore ? <CircularProgress size={loadingIndicatorSize} /> : null}
        </Box>

        {messages.map((message, index) => (
          <Box
            key={message.clientKey ?? message.id}
            data-message-id={message.id}
            sx={{ mb: index === messages.length - 1 ? 0 : messageItemSpacing }}
          >
            <ChatMessageItem
              message={message}
              selectedSourceIds={selectedSourceIds}
              isStreaming={isStreaming}
              isActiveAssistantMessage={
                activeAssistantMessageId === (message.clientKey ?? message.id)
              }
              copied={copiedUserMessageId === message.id}
              savingAsNote={savingAsNoteMessageId === message.id}
              onCopyUserMessage={onCopyUserMessage}
              onSaveAsNote={onSaveAsNote}
              onOpenCitationJump={onOpenCitationJump}
            />
          </Box>
        ))}
      </Box>
    </Stack>
  )
})
