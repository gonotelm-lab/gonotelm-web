import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import type { GetSourceDocResponse } from '@/types/api'
import { buildSourceDocQueryOptions } from '@/api/source'
import { ChatMessageFragments } from './ChatMessageFragments'
import { getCachedSourceIdForDoc, rememberSourceDocMapping } from './citationResolver'
import {
  canShowCitationJumpButton,
  formatCitationPositionText,
  isSummaryCitationPosition,
  normalizeCitationPosition,
  resolveCitationTypeLabel,
} from './chatConversationCommon'
import { extractResponseText } from './streamEventReducer'
import { chatMessageContentTokens } from './layoutTokens'
import { MarkdownRenderer } from '../../shared/markdown/MarkdownRenderer'
import {
  workspaceRadius,
  workspaceRadiusPx,
  workspaceSpace,
} from '../../shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../../shared/ui/motionTokens'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import type { ChatCitationJumpRequest, ChatUiMessage } from './types'
import { workspaceIconSize, workspaceType } from '../../shared/ui/typeTokens'

const actionIconSize = 16
const citationCardOffsetPx = 14
const assistantMessagePaddingY = 0
// Asymmetric chat bubble corners (lg top / sm bottom-left).
const userBubbleBorderRadius = `${workspaceRadiusPx.lg}px ${workspaceRadiusPx.lg}px ${workspaceRadiusPx.sm}px ${workspaceRadiusPx.lg}px`
const citationCardTokens = {
  paperBorderRadius: workspaceRadius.lg,
  maxWidth: 380,
  padding: workspaceSpace.md,
  titleMarginBottom: workspaceSpace.xxs,
  sourceTitleMarginTop: workspaceSpace.xxs,
  contentMarginTop: workspaceSpace.sm,
  contentMaxHeight: 240,
  contentBorderRadius: workspaceRadius.sm,
  contentPaddingX: workspaceSpace.sm,
  contentPaddingY: workspaceSpace.sm,
  loadingGap: workspaceSpace.sm,
  loadingPaddingY: workspaceSpace.xxs,
  loadingSpinnerSize: 14,
}

const messageLayoutTokens = {
  assistantMarginRight: chatMessageContentTokens.sideMarginX,
  assistantMarginLeft: chatMessageContentTokens.sideMarginX,
  actionRowPaddingY: workspaceSpace.md,
  actionRowMinHeight: 28,
  assistantPendingMinHeight: 34,
  assistantPendingDotsLetterSpacing: 2.2,
  assistantPendingDotsFontSize: 21,
  userBubbleMaxWidth: '65%',
  userBubbleMarginRight: chatMessageContentTokens.sideMarginX,
  userBubblePaddingX: workspaceSpace.md,
  userBubblePaddingY: workspaceSpace.sm,
}

const actionControlHeight = messageLayoutTokens.actionRowMinHeight
const saveAsNoteButtonSx = {
  minWidth: 0,
  height: actionControlHeight,
  px: workspaceSpace.sm,
  py: 0,
  borderRadius: 999,
  textTransform: 'none' as const,
  fontSize: workspaceType.xs,
  lineHeight: 1.2,
  whiteSpace: 'nowrap' as const,
  '& .MuiButton-startIcon': {
    marginRight: workspaceSpace.xxs,
    marginLeft: 0,
  },
}

const buildActionButtonSx = (active: boolean) => (theme: Theme) => ({
  p: 0,
  width: actionControlHeight,
  height: actionControlHeight,
  borderRadius: workspaceRadius.sm,
  color: active ? theme.workspacePalette.status.success : 'text.disabled',
  bgcolor: 'transparent',
  transition: workspaceTransitionPresets.interactiveColorBorder,
  '&:hover': {
    bgcolor: 'action.hover',
    color: active ? theme.workspacePalette.status.success : 'text.secondary',
  },
})

interface ChatMessageItemProps {
  message: ChatUiMessage
  selectedSourceIds: string[]
  isStreaming: boolean
  isActiveAssistantMessage: boolean
  copied: boolean
  savingAsNote: boolean
  onCopyUserMessage: (id: string, text: string) => void
  onSaveAsNote?: (messageId: string) => void
  onOpenCitationJump?: (request: ChatCitationJumpRequest) => void
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  selectedSourceIds,
  isStreaming,
  isActiveAssistantMessage,
  copied,
  savingAsNote,
  onCopyUserMessage,
  onSaveAsNote,
  onOpenCitationJump,
}: ChatMessageItemProps) {
  const queryClient = useQueryClient()
  const [citationAnchorPosition, setCitationAnchorPosition] = useState<{
    left: number
    top: number
  } | null>(null)
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null)
  const [activeCitationDoc, setActiveCitationDoc] = useState<GetSourceDocResponse | null>(null)
  const [isCitationLoading, setIsCitationLoading] = useState(false)
  const [citationLoadError, setCitationLoadError] = useState('')
  const citationFetchSeqRef = useRef(0)

  const isUserMessage = message.role === 'user'
  const responseText = useMemo(() => extractResponseText(message), [message])
  const canCopy = Boolean(responseText.trim() || message.fragments.some((f) => f.type === 'REQUEST' && f.request?.content))
  const showAssistantActions = !isStreaming || !isActiveAssistantMessage
  const canSaveAsNote = Boolean(
    onSaveAsNote
      && responseText.trim()
      && !message.id.startsWith('local-')
      && !savingAsNote,
  )

  const userText = message.fragments.find((f) => f.type === 'REQUEST')?.request?.content ?? ''
  const activeCitationSourceId = activeCitationDoc?.source_id
  const activeCitationPosition = normalizeCitationPosition(activeCitationDoc?.position)
  const citationSummary = isSummaryCitationPosition(activeCitationPosition)
  const isOriginalCitation = Boolean(activeCitationPosition && !citationSummary)
  const citationPositionText = useMemo(
    () => formatCitationPositionText(activeCitationPosition, citationSummary),
    [activeCitationPosition, citationSummary],
  )
  const canJumpToSourcePreview = canShowCitationJumpButton({
    onOpenCitationJump,
    sourceId: activeCitationSourceId,
    position: activeCitationPosition,
    isOriginalCitation,
  })

  const fetchCitationDoc = useCallback(async (docId: string, sourceId: string, fetchSeq: number) => {
    try {
      if (citationFetchSeqRef.current !== fetchSeq) return

      const resolvedSourceId =
        sourceId.trim() || getCachedSourceIdForDoc(docId) || selectedSourceIds[0]?.trim()
      if (!resolvedSourceId) {
        if (citationFetchSeqRef.current === fetchSeq) {
          setActiveCitationDoc(null)
          setCitationLoadError('未找到引用来源。')
          setIsCitationLoading(false)
        }
        return
      }

      const sourceDoc = await queryClient.fetchQuery(
        buildSourceDocQueryOptions(resolvedSourceId, docId),
      )

      if (sourceDoc?.source_id) {
        rememberSourceDocMapping(docId, sourceDoc.source_id)
        queryClient.setQueryData(['source-doc', sourceDoc.source_id, docId], sourceDoc)
      }

      if (citationFetchSeqRef.current === fetchSeq) {
        setActiveCitationDoc(sourceDoc)
        setCitationLoadError(sourceDoc ? '' : '未找到引用文档。')
      }
    } catch {
      if (citationFetchSeqRef.current !== fetchSeq) return
      setCitationLoadError('加载引用内容失败，请稍后重试。')
    } finally {
      if (citationFetchSeqRef.current === fetchSeq) {
        setIsCitationLoading(false)
      }
    }
  }, [queryClient, selectedSourceIds])

  const handleCitationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement | HTMLElement>, citationIndex: string) => {
      const index = Number.parseInt(citationIndex, 10)
      const citation = message.citations[index - 1]
      setCitationAnchorPosition({ left: event.clientX + citationCardOffsetPx, top: event.clientY })
      setActiveCitationIndex(Number.isFinite(index) ? index : null)
      setActiveCitationDoc(null)
      setCitationLoadError('')
      citationFetchSeqRef.current += 1
      const fetchSeq = citationFetchSeqRef.current

      if (!Number.isFinite(index) || index <= 0) {
        setIsCitationLoading(false)
        setCitationLoadError('引用编号无效。')
        return
      }

      if (!citation?.docId?.trim()) {
        setIsCitationLoading(false)
        setCitationLoadError('未命中引用映射。')
        return
      }

      setIsCitationLoading(true)
      void fetchCitationDoc(citation.docId.trim(), citation.sourceId ?? '', fetchSeq)
    },
    [fetchCitationDoc, message.citations],
  )

  const handleCloseCitationCard = useCallback(() => {
    citationFetchSeqRef.current += 1
    setCitationAnchorPosition(null)
    setActiveCitationIndex(null)
    setActiveCitationDoc(null)
    setCitationLoadError('')
    setIsCitationLoading(false)
  }, [])

  const handleJumpToSourcePreview = useCallback(() => {
    if (!onOpenCitationJump || !activeCitationSourceId || !isOriginalCitation || !activeCitationPosition) {
      return
    }
    onOpenCitationJump({
      sourceId: activeCitationSourceId,
      sourceTitle: activeCitationDoc?.source_title,
      position: activeCitationPosition,
      snippet: activeCitationDoc?.content,
    })
    handleCloseCitationCard()
  }, [
    activeCitationDoc?.content,
    activeCitationDoc?.source_title,
    activeCitationPosition,
    activeCitationSourceId,
    handleCloseCitationCard,
    isOriginalCitation,
    onOpenCitationJump,
  ])

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
        <ChatMessageFragments
          message={message}
          isStreaming={isStreaming}
          isActiveAssistant={isActiveAssistantMessage}
          onCitationClick={handleCitationClick}
        />

        {showAssistantActions ? (
          <Box
            sx={{
              py: messageLayoutTokens.actionRowPaddingY,
              display: 'flex',
              alignItems: 'center',
              gap: workspaceSpace.sm,
            }}
          >
            <Button
              size="small"
              variant="outlined"
              aria-label="保存到笔记"
              disabled={!canSaveAsNote}
              startIcon={
                savingAsNote ? (
                  <CircularProgress size={actionIconSize} color="inherit" />
                ) : (
                  <PushPinOutlinedIcon sx={{ fontSize: actionIconSize }} />
                )
              }
              onClick={(event) => {
                event.stopPropagation()
                if (!canSaveAsNote || !onSaveAsNote) return
                onSaveAsNote(message.id)
              }}
              sx={saveAsNoteButtonSx}
            >
              {savingAsNote ? '正在保存…' : '保存到笔记'}
            </Button>
            <Tooltip title={copied ? '已复制' : '复制'}>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <IconButton
                  size="small"
                  disabled={!canCopy}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!canCopy) return
                    onCopyUserMessage(message.id, responseText)
                  }}
                  sx={buildActionButtonSx(copied)}
                >
                  {copied ? (
                    <CheckIcon sx={(theme) => ({ fontSize: actionIconSize, color: theme.workspacePalette.status.success })} />
                  ) : (
                    <ContentCopyIcon sx={{ fontSize: actionIconSize }} />
                  )}
                </IconButton>
              </Box>
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
              sx: (theme) => ({
                borderRadius: citationCardTokens.paperBorderRadius,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.dark, 0.2)}`,
              }),
            },
          }}
        >
          <Box sx={{ maxWidth: citationCardTokens.maxWidth, p: citationCardTokens.padding }}>
            <Typography variant="subtitle2" sx={{ mb: citationCardTokens.titleMarginBottom, fontWeight: 700 }}>
              引用信息 {activeCitationIndex ? `[${activeCitationIndex}]` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: citationCardTokens.sourceTitleMarginTop, fontWeight: 600 }}>
              {`来源标题: ${activeCitationDoc?.source_title || '-'}`}
            </Typography>
            <Box
              sx={{
                mt: workspaceSpace.xxs,
                display: 'flex',
                alignItems: 'center',
                gap: workspaceSpace.xxs,
              }}
            >
              <Typography
                variant="body2"
                sx={(theme) => ({
                  fontWeight: 600,
                  color: citationSummary
                    ? theme.workspacePalette.citation.summaryType
                    : theme.workspacePalette.citation.originalType,
                })}
              >
                {`引用类型: ${resolveCitationTypeLabel(citationSummary)}`}
              </Typography>
              {canJumpToSourcePreview ? (
                <Tooltip title="跳转到来源预览">
                  <span>
                    <IconButton size="small" onClick={handleJumpToSourcePreview} sx={{ p: 0, color: 'primary.main' }}>
                      <OpenInNewIcon sx={{ fontSize: workspaceIconSize.md }} />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Box>
            <Typography variant="body2" sx={{ mt: workspaceSpace.xxs, color: 'text.secondary' }}>
              {`位置: ${citationPositionText}`}
            </Typography>
            <Box
              sx={(theme) => ({
                mt: citationCardTokens.contentMarginTop,
                maxHeight: citationCardTokens.contentMaxHeight,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: citationCardTokens.contentBorderRadius,
                px: citationCardTokens.contentPaddingX,
                py: citationCardTokens.contentPaddingY,
                bgcolor: 'background.default',
                ...subtleScrollbarSx(theme),
              })}
            >
              {isCitationLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: citationCardTokens.loadingGap, py: citationCardTokens.loadingPaddingY }}>
                  <CircularProgress size={citationCardTokens.loadingSpinnerSize} />
                  <Typography variant="body2">正在加载引用内容...</Typography>
                </Box>
              ) : citationLoadError ? (
                <Typography variant="body2" sx={(theme) => ({ color: theme.workspacePalette.status.error })}>
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
          mt: messageLayoutTokens.actionRowPaddingY,
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
        <ChatMessageFragments message={message} />
      </Paper>

      <Box className="user-message-actions" sx={{ mr: messageLayoutTokens.userBubbleMarginRight }}>
        <Tooltip title={copied ? '已复制' : '复制'}>
          <span>
            <IconButton
              size="small"
              disabled={!userText.trim()}
              onClick={(event) => {
                event.stopPropagation()
                if (!userText.trim()) return
                onCopyUserMessage(message.id, userText)
              }}
              sx={buildActionButtonSx(copied)}
            >
              {copied ? (
                <CheckIcon sx={(theme) => ({ fontSize: actionIconSize, color: theme.workspacePalette.status.success })} />
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
