import { memo } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Box, CircularProgress, Stack } from '@mui/material'
import { panelTitleToBodySpacing } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { ChatMessageItem } from './ChatMessageItem'
import type { ChatCitationJumpRequest, ChatUiMessage } from './types'
import { workspaceSpace } from '../../shared/ui/layoutTokens'
import {
  chatContentColumnSx,
  chatMessageContentTokens,
  chatReadableColumnSx,
} from './layoutTokens'
import { resolveMessageItemContentVisibility } from './chatConversationCommon'

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
        // 横向永不滚动：封面/正文都受内容列宽度约束。
        overflowX: 'hidden',
        // 两侧对称预留滚动条槽位；否则右侧滚动条会把居中内容整体挤向左边。
        scrollbarGutter: 'stable both-edges',
        overflowAnchor: 'none',
        px: 0,
        ...subtleScrollbarSx(theme),
      })}
    >
      <Box
        sx={chatContentColumnSx}
      >
        {notebookInfoHeader}

        {/* 聊天记录/分隔线：与摘要、输入框共用可读列。 */}
        <Box sx={chatReadableColumnSx}>
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

        {messages.map((message, index) => {
          const messageKey = message.clientKey ?? message.id
          // Match either stable clientKey or server id — resume must keep phase UI active.
          const isActiveAssistantMessage = Boolean(
            activeAssistantMessageId &&
              (activeAssistantMessageId === messageKey ||
                activeAssistantMessageId === message.id ||
                activeAssistantMessageId === message.clientKey),
          )
          const isLastMessage = index === messages.length - 1
          return (
            <Box
              key={messageKey}
              data-message-id={message.id}
              sx={{
                mb: isLastMessage ? 0 : messageItemSpacing,
                // Skip layout work for offscreen history (rendering-content-visibility).
                // Keep the last message fully measured so stream completion can pin to the real bottom.
                contentVisibility: resolveMessageItemContentVisibility(isLastMessage),
                containIntrinsicSize: isLastMessage ? undefined : '0 120px',
              }}
            >
              <ChatMessageItem
                message={message}
                selectedSourceIds={selectedSourceIds}
                isStreaming={isStreaming && isActiveAssistantMessage}
                isActiveAssistantMessage={isActiveAssistantMessage}
                copied={copiedUserMessageId === message.id}
                savingAsNote={savingAsNoteMessageId === message.id}
                onCopyUserMessage={onCopyUserMessage}
                onSaveAsNote={onSaveAsNote}
                onOpenCitationJump={onOpenCitationJump}
              />
            </Box>
          )
        })}
        </Box>
      </Box>
    </Stack>
  )
})
