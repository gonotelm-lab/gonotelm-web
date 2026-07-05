import { memo, useMemo } from 'react'
import type { ReactNode, RefObject } from 'react'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { panelTitleToBodySpacing } from '../../shared/ui/panelStyles'
import { workspaceAnimation } from '../../shared/ui/motionTokens'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { ChatMessageItem } from './ChatMessageItem'
import type { ChatCitationJumpRequest, ChatUiMessage } from './types'
import { chatMessageContentTokens } from './layoutTokens'
import type { StreamDisplayPhaseType } from './chatConversationCommon'

const messageItemSpacing = 2.75
const loadingIndicatorRowMinHeight = 18
const loadingIndicatorSize = 13
const streamStatusRowMarginBottom = 0.55
const streamStatusIconSize = 16
const messageListLayoutTokens = {
  marginTop: panelTitleToBodySpacing,
  innerPaddingX: chatMessageContentTokens.scrollInnerPaddingX,
  notebookDividerMarginY: 2.5,
  notebookDividerColor: 'divider',
}
const streamStatusRowTokens = {
  marginRight: chatMessageContentTokens.sideMarginX,
  marginLeft: chatMessageContentTokens.sideMarginX,
  gap: 0.5,
  textFontSize: 14.3,
  textLetterSpacing: 0.1,
  color: 'text.secondary',
}
const streamStatusFlowTokens = {
  backgroundSize: '240% 100%',
  animationDurationSec: workspaceAnimation.streamStatusFlowDurationSec,
  backgroundStartPosition: '160% 0',
  backgroundEndPosition: '-160% 0',
}

interface ChatMessagesListProps {
  messageListRef: RefObject<HTMLDivElement | null>
  selectedSourceIds: string[]
  notebookInfoHeader?: ReactNode
  messages: ChatUiMessage[]
  streamStatus: string
  streamPhaseType: StreamDisplayPhaseType
  showStreamFlowAnimation: boolean
  isLoadingHistory: boolean
  isFetchingMore: boolean
  isStreaming: boolean
  activeAssistantMessageId: string | null
  copiedUserMessageId: string | null
  onScrollTopCheck: () => void
  onCopyUserMessage: (id: string, text: string) => void
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
  streamStatus,
  streamPhaseType,
  showStreamFlowAnimation,
  isLoadingHistory,
  isFetchingMore,
  isStreaming,
  activeAssistantMessageId,
  copiedUserMessageId,
  onScrollTopCheck,
  onCopyUserMessage,
  onOpenCitationJump,
}: ChatMessagesListProps) {
  const theme = useTheme()
  const streamStatusFlowGradient = useMemo(
    () =>
      `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.72)} 0%, ${alpha(theme.palette.primary.main, 0.72)} 10%, ${alpha(theme.palette.primary.main, 0.78)} 25%, ${alpha(theme.palette.primary.main, 0.88)} 40%, ${alpha(theme.palette.primary.dark, 0.98)} 50%, ${alpha(theme.palette.primary.main, 0.88)} 60%, ${alpha(theme.palette.primary.main, 0.78)} 75%, ${alpha(theme.palette.primary.main, 0.72)} 90%, ${alpha(theme.palette.primary.main, 0.72)} 100%)`,
    [theme.palette.primary.dark, theme.palette.primary.main],
  )

  // Status icon intentionally mirrors backend stream phase to make retrieval/thinking states glanceable.
  const streamStatusIcon =
    streamPhaseType === 'phase' ? (
      <ManageSearchRoundedIcon
        sx={{ fontSize: streamStatusIconSize, color: streamStatusRowTokens.color, flexShrink: 0 }}
      />
    ) : null

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
        scrollbarWidth: 'auto',
        scrollbarColor: 'auto',
        '&:hover': {
          scrollbarColor: 'auto',
        },
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
            key={message.id}
            data-message-id={message.id}
            sx={{ mb: index === messages.length - 1 ? 0 : messageItemSpacing }}
          >
            {/* Only the active assistant message should display live stream status to avoid duplicated indicators. */}
            {streamStatus && activeAssistantMessageId === message.id && message.role === 'assistant' ? (
              <Box
                sx={{
                  mb: streamStatusRowMarginBottom,
                  mr: streamStatusRowTokens.marginRight,
                  ml: streamStatusRowTokens.marginLeft,
                  display: 'flex',
                  alignItems: 'center',
                  gap: streamStatusRowTokens.gap,
                }}
              >
                {streamStatusIcon}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: streamStatusRowTokens.textFontSize,
                    fontWeight: 600,
                    color: streamStatusRowTokens.color,
                    letterSpacing: streamStatusRowTokens.textLetterSpacing,
                    // Animated gradient is opt-in so we can disable motion without changing status semantics.
                    ...(showStreamFlowAnimation
                      ? {
                          color: 'transparent',
                          background: streamStatusFlowGradient,
                          backgroundSize: streamStatusFlowTokens.backgroundSize,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          animation: `stream-status-text-flow ${streamStatusFlowTokens.animationDurationSec}s linear infinite`,
                          '@keyframes stream-status-text-flow': {
                            from: { backgroundPosition: streamStatusFlowTokens.backgroundStartPosition },
                            to: { backgroundPosition: streamStatusFlowTokens.backgroundEndPosition },
                          },
                        }
                      : null),
                  }}
                >
                  {streamStatus}
                </Typography>
              </Box>
            ) : null}
            <ChatMessageItem
              message={message}
              selectedSourceIds={selectedSourceIds}
              isStreaming={isStreaming}
              isActiveAssistantMessage={activeAssistantMessageId === message.id}
              copied={copiedUserMessageId === message.id}
              onCopyUserMessage={onCopyUserMessage}
              onOpenCitationJump={onOpenCitationJump}
            />
          </Box>
        ))}
      </Box>
    </Stack>
  )
})
