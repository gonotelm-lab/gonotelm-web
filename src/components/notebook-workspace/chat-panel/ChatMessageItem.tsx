import { memo, useCallback, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  IconButton,
  Paper,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material'
import { AssistantMarkdown } from './AssistantMarkdown'
import type { ChatUiCitationDetail, ChatUiMessage } from './types'

const actionIconSize = 16
const citationCardOffsetPx = 14

const messageLayoutTokens = {
  assistantMarginRight: 1,
  assistantMarginLeft: 0.75,
  actionRowMarginTop: 0.8,
  actionRowMinHeight: 28,
  userBubbleMaxWidth: '65%',
  userBubbleMarginRight: 0.75,
  userBubblePaddingX: 1.25,
  userBubblePaddingY: 0.9,
  userTextFontSize: 14.5,
  userTextLineHeight: 1.65,
}

const buildActionButtonSx = (copied: boolean) => ({
  p: 0,
  borderRadius: 0,
  color: copied ? 'success.main' : 'text.disabled',
  bgcolor: 'transparent',
  '&:hover': {
    bgcolor: 'transparent',
    color: copied ? 'success.main' : 'text.secondary',
  },
})

interface ChatMessageItemProps {
  message: ChatUiMessage
  isStreaming: boolean
  isActiveAssistantMessage: boolean
  copied: boolean
  onCopyUserMessage: (id: string, text: string) => void
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isStreaming,
  isActiveAssistantMessage,
  copied,
  onCopyUserMessage,
}: ChatMessageItemProps) {
  const [citationAnchorPosition, setCitationAnchorPosition] = useState<{
    left: number
    top: number
  } | null>(null)
  const [activeCitationRef, setActiveCitationRef] = useState<{
    sourceIndex: string
    docIndex: string
  } | null>(null)
  const [activeCitationDetail, setActiveCitationDetail] = useState<ChatUiCitationDetail | null>(null)
  const isUserMessage = message.role === 'user'
  const showStreamingPlaceholder =
    isStreaming && isActiveAssistantMessage && !message.text
  const renderedText = showStreamingPlaceholder ? '' : message.text || ' '
  const assistantRenderedText = renderedText
  const canCopy = Boolean(message.text.trim())
  const showAssistantActions = !isStreaming || !isActiveAssistantMessage
  const citationDetailMap = useMemo(() => {
    const detailMap = new Map<string, ChatUiCitationDetail>()
    for (const citationDetail of message.citationDetails ?? []) {
      detailMap.set(`${citationDetail.sourceIndex}#${citationDetail.docIndex}`, citationDetail)
    }
    return detailMap
  }, [message.citationDetails])

  const handleCitationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, sourceIndex: string, docIndex: string) => {
      setCitationAnchorPosition({
        left: event.clientX + citationCardOffsetPx,
        top: event.clientY,
      })
      setActiveCitationRef({ sourceIndex, docIndex })
      setActiveCitationDetail(citationDetailMap.get(`${sourceIndex}#${docIndex}`) ?? null)
    },
    [citationDetailMap],
  )

  const handleCloseCitationCard = useCallback(() => {
    setCitationAnchorPosition(null)
    setActiveCitationRef(null)
    setActiveCitationDetail(null)
  }, [])

  if (!isUserMessage) {
    return (
      <Box
        sx={{
          maxWidth: '100%',
          py: 0.15,
          mr: messageLayoutTokens.assistantMarginRight,
          ml: messageLayoutTokens.assistantMarginLeft,
        }}
      >
        <AssistantMarkdown content={assistantRenderedText} onCitationClick={handleCitationClick} />

        {showAssistantActions ? (
          <Box
            sx={{
              mt: messageLayoutTokens.actionRowMarginTop,
              minHeight: messageLayoutTokens.actionRowMinHeight,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Tooltip title={copied ? '已复制' : '复制'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canCopy}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!canCopy) return
                    onCopyUserMessage(message.id, message.text)
                  }}
                  sx={buildActionButtonSx(copied)}
                >
                  {copied ? (
                    <CheckIcon sx={{ fontSize: actionIconSize, color: 'success.main' }} />
                  ) : (
                    <ContentCopyIcon sx={{ fontSize: actionIconSize }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ) : null}

        <Popover
          open={Boolean(citationAnchorPosition && activeCitationRef)}
          anchorReference="anchorPosition"
          anchorPosition={citationAnchorPosition ?? undefined}
          onClose={handleCloseCitationCard}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 1.25,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
              },
            },
          }}
        >
          <Box sx={{ maxWidth: 320, p: 1.3 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
              引用信息
            </Typography>
            <Typography variant="body2">{`source_idx: ${activeCitationRef?.sourceIndex ?? '-'}`}</Typography>
            <Typography variant="body2">{`doc_idx: ${activeCitationRef?.docIndex ?? '-'}`}</Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {`source_id: ${activeCitationDetail?.sourceId ?? '未命中映射'}`}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {`doc_id: ${activeCitationDetail?.docId ?? '未命中映射'}`}
            </Typography>
          </Box>
        </Popover>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        alignItems: 'flex-end',
        '& .user-message-actions': {
          opacity: 0,
          mt: messageLayoutTokens.actionRowMarginTop,
          minHeight: messageLayoutTokens.actionRowMinHeight,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
        },
        '&:hover .user-message-actions, &:focus-within .user-message-actions': {
          opacity: 1,
          pointerEvents: 'auto',
        },
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          maxWidth: messageLayoutTokens.userBubbleMaxWidth,
          ml: 'auto',
          mr: messageLayoutTokens.userBubbleMarginRight,
          px: messageLayoutTokens.userBubblePaddingX,
          py: messageLayoutTokens.userBubblePaddingY,
          borderRadius: '16px 16px 6px 16px',
          borderColor: 'primary.main',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: messageLayoutTokens.userTextFontSize,
            lineHeight: messageLayoutTokens.userTextLineHeight,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {renderedText}
        </Typography>
      </Paper>

      <Box className="user-message-actions" sx={{ mr: messageLayoutTokens.userBubbleMarginRight }}>
        <Tooltip title={copied ? '已复制' : '复制'}>
          <span>
            <IconButton
              size="small"
              disabled={!canCopy}
              onClick={(event) => {
                event.stopPropagation()
                if (!canCopy) return
                onCopyUserMessage(message.id, message.text)
              }}
              sx={buildActionButtonSx(copied)}
            >
              {copied ? (
                <CheckIcon sx={{ fontSize: actionIconSize, color: 'success.main' }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: actionIconSize }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
})
