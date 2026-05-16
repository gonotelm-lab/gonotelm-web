import { memo } from 'react'
import type { RefObject } from 'react'
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import PsychologyAltRoundedIcon from '@mui/icons-material/PsychologyAltRounded'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { subtleScrollbarSx } from '../../shared/ui'
import { ChatMessageItem } from './ChatMessageItem'
import type { ChatUiMessage } from './types'
import type { MessageStreamPhaseType } from '@/types/api'

const messageItemSpacing = 2.75
const loadingIndicatorRowMinHeight = 18
const loadingIndicatorSize = 13
const streamStatusRowMarginBottom = 0.55
const streamStatusIconSize = 16
const messageListLayoutTokens = {
  marginTop: 2,
  paddingX: 0.75,
}
const streamStatusRowTokens = {
  marginRight: 1,
  marginLeft: 0.75,
  gap: 0.5,
  textFontSize: 14.3,
  textLetterSpacing: 0.1,
  color: 'rgba(96,96,96,0.86)',
}
const streamStatusFlowTokens = {
  gradient:
    'linear-gradient(90deg, rgba(96,96,96,0.9) 0%, rgba(96,96,96,0.9) 10%, rgba(108,108,108,0.9) 20%, rgba(120,120,120,0.9) 30%, rgba(140,140,140,0.92) 40%, rgba(196,196,196,0.96) 50%, rgba(140,140,140,0.92) 60%, rgba(120,120,120,0.9) 70%, rgba(108,108,108,0.9) 80%, rgba(96,96,96,0.9) 90%, rgba(96,96,96,0.9) 100%)',
  backgroundSize: '240% 100%',
  animationDurationSec: 3.1,
  backgroundStartPosition: '160% 0',
  backgroundEndPosition: '-160% 0',
}

interface ChatMessagesListProps {
  messageListRef: RefObject<HTMLDivElement | null>
  messages: ChatUiMessage[]
  streamStatus: string
  streamPhaseType: MessageStreamPhaseType | null
  showStreamFlowAnimation: boolean
  isLoadingHistory: boolean
  isFetchingMore: boolean
  isStreaming: boolean
  activeAssistantMessageId: string | null
  copiedUserMessageId: string | null
  onScrollTopCheck: () => void
  onCopyUserMessage: (id: string, text: string) => void
}

export const ChatMessagesList = memo(function ChatMessagesList({
  messageListRef,
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
}: ChatMessagesListProps) {
  const streamStatusIcon =
    streamPhaseType === 'retrieving' ? (
      <ManageSearchRoundedIcon
        sx={{ fontSize: streamStatusIconSize, color: streamStatusRowTokens.color, flexShrink: 0 }}
      />
    ) : streamPhaseType === 'thinking' ? (
      <PsychologyAltRoundedIcon
        sx={{ fontSize: streamStatusIconSize, color: streamStatusRowTokens.color, flexShrink: 0 }}
      />
    ) : null

  return (
    <Stack
      ref={messageListRef}
      className="chat-messages-scroll"
      spacing={0}
      onScroll={onScrollTopCheck}
      sx={{
        mt: messageListLayoutTokens.marginTop,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowAnchor: 'none',
        px: messageListLayoutTokens.paddingX,
        ...subtleScrollbarSx,
        scrollbarWidth: 'auto',
        scrollbarColor: 'auto',
        '&:hover': {
          scrollbarColor: 'auto',
        },
      }}
    >
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

      {!isLoadingHistory && messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          还没有对话，输入你的第一个问题开始吧。
        </Typography>
      ) : null}

      {messages.map((message, index) => (
        <Box
          key={message.id}
          data-message-id={message.id}
          sx={{ mb: index === messages.length - 1 ? 0 : messageItemSpacing }}
        >
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
                  ...(showStreamFlowAnimation
                    ? {
                        color: 'transparent',
                        background: streamStatusFlowTokens.gradient,
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
            isStreaming={isStreaming}
            isActiveAssistantMessage={activeAssistantMessageId === message.id}
            copied={copiedUserMessageId === message.id}
            onCopyUserMessage={onCopyUserMessage}
          />
        </Box>
      ))}
    </Stack>
  )
})
