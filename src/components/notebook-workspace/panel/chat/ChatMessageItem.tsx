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
import type { Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { GetSourceDocResponse } from '@/types/api'
import { buildSourceDocQueryOptions } from '@/api/source'
import { ChatMessageFragments } from './ChatMessageFragments'
import { getCachedSourceIdForDoc, rememberSourceDocMapping } from './citationResolver'
import {
  canShowCitationJumpButton,
  formatCitationPositionText,
  isLocatableCitationPosition,
  normalizeCitationPosition,
} from './chatConversationCommon'
import { extractResponseText } from './streamEventReducer'
import { chatMessageContentTokens } from './layoutTokens'
import { MarkdownRenderer } from '../../shared/markdown/MarkdownRenderer'
import type { CitationClickTarget } from '../../shared/markdown/MarkdownRenderer'
import {
  workspaceRadius,
  workspaceRadiusPx,
  workspaceSpace,
} from '../../shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../../shared/ui/motionTokens'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { resolveWorkspaceElevation } from '../../shared/ui/workspaceElevation'
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
  const { t } = useTranslation(['chat', 'common'])
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
  const hasResponse = Boolean(responseText.trim())
  // No RESPONSE content → hide save/copy entirely (not just disable).
  const showAssistantActions =
    hasResponse && (!isStreaming || !isActiveAssistantMessage)
  const canCopy = hasResponse
  const canSaveAsNote = Boolean(
    onSaveAsNote
      && hasResponse
      && !message.id.startsWith('local-')
      && !savingAsNote,
  )

  const userText = message.fragments.find((f) => f.type === 'REQUEST')?.request?.content ?? ''
  const activeCitationSourceId = activeCitationDoc?.source_id
  const activeCitationPosition = normalizeCitationPosition(activeCitationDoc?.position)
  const citationPositionText = useMemo(
    () => formatCitationPositionText(activeCitationPosition),
    [activeCitationPosition],
  )
  const canJumpToSourcePreview = canShowCitationJumpButton({
    onOpenCitationJump,
    sourceId: activeCitationSourceId,
    position: activeCitationPosition,
  })

  const resetCitationCard = useCallback(() => {
    setCitationAnchorPosition(null)
    setActiveCitationIndex(null)
    setActiveCitationDoc(null)
    setCitationLoadError('')
    setIsCitationLoading(false)
  }, [])

  const fetchCitationDoc = useCallback(async (
    docId: string,
    sourceId: string,
    fetchSeq: number,
  ): Promise<GetSourceDocResponse | null> => {
    try {
      if (citationFetchSeqRef.current !== fetchSeq) return null

      const resolvedSourceId =
        sourceId.trim() || getCachedSourceIdForDoc(docId) || selectedSourceIds[0]?.trim()
      if (!resolvedSourceId) {
        if (citationFetchSeqRef.current === fetchSeq) {
          setCitationLoadError(t('chat:citation.notFoundSource'))
        }
        return null
      }

      const sourceDoc = await queryClient.fetchQuery(
        buildSourceDocQueryOptions(resolvedSourceId, docId),
      )

      if (sourceDoc?.source_id) {
        rememberSourceDocMapping(docId, sourceDoc.source_id)
        queryClient.setQueryData(['source-doc', sourceDoc.source_id, docId], sourceDoc)
      }

      if (citationFetchSeqRef.current !== fetchSeq) return null
      if (!sourceDoc) {
        setCitationLoadError(t('chat:citation.notFoundDoc'))
        return null
      }
      return sourceDoc
    } catch {
      if (citationFetchSeqRef.current !== fetchSeq) return null
      setCitationLoadError(t('chat:citation.loadFailed'))
      return null
    }
  }, [queryClient, selectedSourceIds, t])

  const handleCitationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement | HTMLElement>, target: CitationClickTarget) => {
      const citationIndex = target.citationIndex ?? ''
      const index = Number.parseInt(citationIndex, 10)
      const citation = message.citations[index - 1]
      const clickAnchor = {
        left: event.clientX + citationCardOffsetPx,
        top: event.clientY,
      }

      citationFetchSeqRef.current += 1
      const fetchSeq = citationFetchSeqRef.current
      resetCitationCard()

      if (!Number.isFinite(index) || index <= 0 || !citation?.docId?.trim()) {
        return
      }

      setActiveCitationIndex(index)
      setIsCitationLoading(true)
      void (async () => {
        const sourceDoc = await fetchCitationDoc(
          citation.docId.trim(),
          citation.sourceId ?? '',
          fetchSeq,
        )
        if (citationFetchSeqRef.current !== fetchSeq) return

        if (!sourceDoc) {
          // 加载失败时打开卡片展示错误，避免点击无反馈
          setActiveCitationDoc(null)
          setCitationAnchorPosition(clickAnchor)
          setIsCitationLoading(false)
          return
        }

        const position = normalizeCitationPosition(sourceDoc.position)
        if (!isLocatableCitationPosition(position)) {
          // 不可定位：不打开引用卡片
          resetCitationCard()
          return
        }

        setActiveCitationDoc(sourceDoc)
        setCitationLoadError('')
        setCitationAnchorPosition(clickAnchor)
        setIsCitationLoading(false)
      })()
    },
    [fetchCitationDoc, message.citations, resetCitationCard],
  )

  const handleCloseCitationCard = useCallback(() => {
    citationFetchSeqRef.current += 1
    resetCitationCard()
  }, [resetCitationCard])

  const handleJumpToSourcePreview = useCallback(() => {
    if (
      !onOpenCitationJump
      || !activeCitationSourceId
      || !isLocatableCitationPosition(activeCitationPosition)
      || !activeCitationPosition
    ) {
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
            {onSaveAsNote ? (
              <Button
                size="small"
                variant="outlined"
                aria-label={t('chat:message.saveNote')}
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
                  if (!canSaveAsNote) return
                  onSaveAsNote(message.id)
                }}
                sx={saveAsNoteButtonSx}
              >
                {savingAsNote ? t('chat:message.saving') : t('chat:message.saveNote')}
              </Button>
            ) : null}
            <Tooltip title={copied ? t('common:action.copied') : t('common:action.copy')}>
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
                boxShadow: resolveWorkspaceElevation(theme).message,
              }),
            },
          }}
        >
          <Box sx={{ maxWidth: citationCardTokens.maxWidth, p: citationCardTokens.padding }}>
            <Typography variant="subtitle2" sx={{ mb: citationCardTokens.titleMarginBottom, fontWeight: 700 }}>
              {t('chat:citation.info', {
                index: activeCitationIndex ? `[${activeCitationIndex}]` : '',
              })}
            </Typography>
            <Typography variant="body2" sx={{ mt: citationCardTokens.sourceTitleMarginTop, fontWeight: 600 }}>
              {t('chat:citation.sourceTitle', {
                title: activeCitationDoc?.source_title || '-',
              })}
            </Typography>
            <Box
              sx={{
                mt: workspaceSpace.xxs,
                display: 'flex',
                alignItems: 'center',
                gap: workspaceSpace.xxs,
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('chat:citation.position', { text: citationPositionText })}
              </Typography>
              {canJumpToSourcePreview ? (
                <Tooltip title={t('chat:citation.jump')}>
                  <span>
                    <IconButton size="small" onClick={handleJumpToSourcePreview} sx={{ p: 0, color: 'primary.main' }}>
                      <OpenInNewIcon sx={{ fontSize: workspaceIconSize.md }} />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Box>
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
                  <Typography variant="body2">{t('chat:citation.loading')}</Typography>
                </Box>
              ) : citationLoadError ? (
                <Typography variant="body2" sx={(theme) => ({ color: theme.workspacePalette.status.error })}>
                  {citationLoadError}
                </Typography>
              ) : (
                <MarkdownRenderer
                  content={activeCitationDoc?.content || t('chat:citation.empty')}
                />
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
        <Tooltip title={copied ? t('common:action.copied') : t('common:action.copy')}>
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
