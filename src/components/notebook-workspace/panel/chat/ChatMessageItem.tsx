import { memo, useCallback, useRef, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { buildSourceDocQueryOptions } from '@/api/source'
import type { GetSourceDocResponse } from '@/types/api'
import { AssistantMarkdown } from './AssistantMarkdown'
import { chatMessageContentTokens } from './layoutTokens'
import { MarkdownRenderer } from '../../shared/markdown'
import type { ChatUiCitationDetail, ChatUiMessage } from './types'

const actionIconSize = 16
const citationCardOffsetPx = 14
const assistantMessagePaddingY = 0.15
const userBubbleBorderRadius = '16px 16px 6px 16px'

const citationCardTokens = {
  paperBorderRadius: 1.25,
  paperBoxShadow: '0 8px 24px rgba(15,23,42,0.14)',
  maxWidth: 380,
  padding: 1.3,
  titleMarginBottom: 0.5,
  sourceTitleMarginTop: 0.4,
  contentMarginTop: 0.7,
  contentMaxHeight: 240,
  contentBorderRadius: 0.8,
  contentPaddingX: 0.8,
  contentPaddingY: 0.7,
  loadingGap: 0.8,
  loadingPaddingY: 0.4,
  loadingSpinnerSize: 14,
}

const messageLayoutTokens = {
  assistantMarginRight: chatMessageContentTokens.sideMarginX,
  assistantMarginLeft: chatMessageContentTokens.sideMarginX,
  actionRowMarginTop: 0.8,
  actionRowMinHeight: 28,
  assistantPendingMinHeight: 34,
  assistantPendingDotsLetterSpacing: 2.2,
  assistantPendingDotsFontSize: 21,
  userBubbleMaxWidth: '65%',
  userBubbleMarginRight: chatMessageContentTokens.sideMarginX,
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
  enableThinking: boolean
  isStreaming: boolean
  isActiveAssistantMessage: boolean
  copied: boolean
  onCopyUserMessage: (id: string, text: string) => void
}

/**
 * Renders one chat bubble (assistant or user) and encapsulates message-level interactions:
 * copy action, citation popover loading, and streaming-aware assistant action visibility.
 */
export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  enableThinking,
  isStreaming,
  isActiveAssistantMessage,
  copied,
  onCopyUserMessage,
}: ChatMessageItemProps) {
  const queryClient = useQueryClient()
  const [citationAnchorPosition, setCitationAnchorPosition] = useState<{
    left: number
    top: number
  } | null>(null)
  const [activeCitationDoc, setActiveCitationDoc] = useState<GetSourceDocResponse | null>(null)
  const [isCitationLoading, setIsCitationLoading] = useState(false)
  const [citationLoadError, setCitationLoadError] = useState('')
  // Sequence guard prevents out-of-order async citation responses from overriding the latest click.
  const citationFetchSeqRef = useRef(0)
  const isUserMessage = message.role === 'user'
  const showStreamingPlaceholder =
    isStreaming && isActiveAssistantMessage && !message.text
  const showPendingDots =
    showStreamingPlaceholder && !enableThinking
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

  /**
   * Fetches citation document content for the currently selected marker.
   * Sequence id guards ensure late responses from previous clicks are ignored.
   */
  const fetchCitationDoc = useCallback(async (sourceId: string, docId: string, fetchSeq: number) => {
    try {
      const sourceDoc = await queryClient.fetchQuery(buildSourceDocQueryOptions(sourceId, docId))
      if (citationFetchSeqRef.current !== fetchSeq) {
        return
      }
      setActiveCitationDoc(sourceDoc)
      setCitationLoadError('')
    } catch {
      if (citationFetchSeqRef.current !== fetchSeq) {
        return
      }
      setCitationLoadError('加载引用内容失败，请稍后重试。')
    } finally {
      if (citationFetchSeqRef.current === fetchSeq) {
        setIsCitationLoading(false)
      }
    }
  }, [queryClient])

  /**
   * Opens citation popover at click position and starts a new fetch generation
   * so only the latest selected citation can update visible detail state.
   */
  const handleCitationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, sourceIndex: string, docIndex: string) => {
      setCitationAnchorPosition({
        left: event.clientX + citationCardOffsetPx,
        top: event.clientY,
      })
      const citationDetail = citationDetailMap.get(`${sourceIndex}#${docIndex}`) ?? null
      setActiveCitationDoc(null)
      setCitationLoadError('')

      // Every click starts a new request generation; older results become stale immediately.
      citationFetchSeqRef.current += 1
      const fetchSeq = citationFetchSeqRef.current

      if (!citationDetail?.sourceId || !citationDetail?.docId) {
        setIsCitationLoading(false)
        setCitationLoadError('未命中引用映射。')
        return
      }

      setIsCitationLoading(true)
      void fetchCitationDoc(citationDetail.sourceId, citationDetail.docId, fetchSeq)
    },
    [citationDetailMap, fetchCitationDoc],
  )

  const handleCloseCitationCard = useCallback(() => {
    // Closing the popover also invalidates in-flight fetches to avoid late state writes.
    citationFetchSeqRef.current += 1
    setCitationAnchorPosition(null)
    setActiveCitationDoc(null)
    setCitationLoadError('')
    setIsCitationLoading(false)
  }, [])

  if (!isUserMessage) {
    return (
      <Box
        sx={{
          maxWidth: '100%',
          py: assistantMessagePaddingY,
          mr: messageLayoutTokens.assistantMarginRight,
          ml: messageLayoutTokens.assistantMarginLeft,
        }}
      >
        {showPendingDots ? (
          <Box
            aria-live="polite"
            sx={{
              minHeight: messageLayoutTokens.assistantPendingMinHeight,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              component="span"
              sx={{
                color: 'text.disabled',
                fontSize: messageLayoutTokens.assistantPendingDotsFontSize,
                lineHeight: 1,
                letterSpacing: messageLayoutTokens.assistantPendingDotsLetterSpacing,
                display: 'inline-block',
                width: '3ch',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                animation: 'chat-pending-ellipsis 1.2s steps(4, end) infinite',
                '@keyframes chat-pending-ellipsis': {
                  '0%': { width: '0ch', opacity: 0.38 },
                  '50%': { width: '3ch', opacity: 0.9 },
                  '100%': { width: '0ch', opacity: 0.38 },
                },
              }}
            >
              ...
            </Box>
          </Box>
        ) : (
          <AssistantMarkdown content={assistantRenderedText} onCitationClick={handleCitationClick} />
        )}

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
          open={Boolean(citationAnchorPosition)}
          anchorReference="anchorPosition"
          anchorPosition={citationAnchorPosition ?? undefined}
          onClose={handleCloseCitationCard}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: citationCardTokens.paperBorderRadius,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: citationCardTokens.paperBoxShadow,
              },
            },
          }}
        >
          <Box sx={{ maxWidth: citationCardTokens.maxWidth, p: citationCardTokens.padding }}>
            <Typography variant="subtitle2" sx={{ mb: citationCardTokens.titleMarginBottom, fontWeight: 700 }}>
              引用信息
            </Typography>
            <Typography variant="body2" sx={{ mt: citationCardTokens.sourceTitleMarginTop, fontWeight: 600 }}>
              {`来源标题: ${activeCitationDoc?.source_title || '-'}`}
            </Typography>
            <Box
              sx={{
                mt: citationCardTokens.contentMarginTop,
                maxHeight: citationCardTokens.contentMaxHeight,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: citationCardTokens.contentBorderRadius,
                px: citationCardTokens.contentPaddingX,
                py: citationCardTokens.contentPaddingY,
                bgcolor: 'background.default',
              }}
            >
              {isCitationLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: citationCardTokens.loadingGap,
                    py: citationCardTokens.loadingPaddingY,
                  }}
                >
                  <CircularProgress size={citationCardTokens.loadingSpinnerSize} />
                  <Typography variant="body2">正在加载引用内容...</Typography>
                </Box>
              ) : citationLoadError ? (
                <Typography variant="body2" color="error.main">
                  {citationLoadError}
                </Typography>
              ) : (
                <MarkdownRenderer content={activeCitationDoc?.content || '暂无内容'} />
              )}
            </Box>
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
          borderRadius: userBubbleBorderRadius,
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
