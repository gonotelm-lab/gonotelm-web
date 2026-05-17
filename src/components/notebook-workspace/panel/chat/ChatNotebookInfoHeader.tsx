import { useCallback, useEffect, useRef, useState } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { chatMessageContentTokens } from './layoutTokens'

const notebookInfoTokens = {
  marginTop: 0,
  iconSlotSize: 34,
  iconSlotRadius: 10,
  iconSlotBorderColor: 'rgba(148,163,184,0.28)',
  iconColor: 'rgba(148,163,184,0.92)',
  titleLineClamp: 2,
  actionRowMinHeight: 28,
  actionIconSize: 16,
}

const fallbackNotebookName = 'Untitled notebook'

const formatSourceCountLabel = (sourceCount: number) => {
  const normalizedCount = Number.isFinite(sourceCount) && sourceCount > 0
    ? Math.floor(sourceCount)
    : 0
  return `${normalizedCount} ${normalizedCount === 1 ? 'source' : 'sources'}`
}

const buildCopyActionButtonSx = (copied: boolean) => ({
  p: 0,
  borderRadius: 0,
  color: copied ? 'success.main' : 'text.disabled',
  bgcolor: 'transparent',
  '&:hover': {
    bgcolor: 'transparent',
    color: copied ? 'success.main' : 'text.secondary',
  },
})

interface ChatNotebookInfoHeaderProps {
  notebookName: string
  notebookDescription: string
  notebookSourceCount: number
}

export function ChatNotebookInfoHeader({
  notebookName,
  notebookDescription,
  notebookSourceCount,
}: ChatNotebookInfoHeaderProps) {
  const [copied, setCopied] = useState(false)
  const copyResetTimerRef = useRef<number | null>(null)
  const title = notebookName.trim() || fallbackNotebookName
  const description = notebookDescription.trim()
  const sourceCountLabel = formatSourceCountLabel(notebookSourceCount)
  const copyPayload = [title, description, sourceCountLabel]
    .filter((part) => part.trim().length > 0)
    .join('\n')
  const canCopy = Boolean(copyPayload.trim())

  const handleCopyNotebookInfo = useCallback(() => {
    if (!canCopy) return
    void navigator.clipboard.writeText(copyPayload).then(() => {
      setCopied(true)
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current)
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false)
      }, 1200)
    }).catch(() => {
      setCopied(false)
    })
  }, [canCopy, copyPayload])

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current)
      }
    }
  }, [])

  return (
    <Box
      data-testid="chat-notebook-info-header"
      sx={{
        mt: notebookInfoTokens.marginTop,
        ml: chatMessageContentTokens.sideMarginX,
        mr: chatMessageContentTokens.sideMarginX,
      }}
    >
      <Stack spacing={0.9} sx={{ minWidth: 0, flex: 1 }}>
        <Box
          data-testid="chat-notebook-icon-slot"
          aria-hidden
          sx={{
            flexShrink: 0,
            width: notebookInfoTokens.iconSlotSize,
            height: notebookInfoTokens.iconSlotSize,
            borderRadius: notebookInfoTokens.iconSlotRadius,
            border: 1,
            borderColor: notebookInfoTokens.iconSlotBorderColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 17, color: notebookInfoTokens.iconColor }} />
        </Box>

        <Typography
          variant="h5"
          component="h2"
          sx={{
            minWidth: 0,
            fontSize: { xs: '1.35rem', md: '2.05rem' },
            lineHeight: 1.2,
            fontWeight: 620,
            letterSpacing: 0.15,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: notebookInfoTokens.titleLineClamp,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            width: '100%',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            textAlign: 'justify',
            textJustify: 'inter-character',
            textAlignLast: 'left',
            minHeight: '1.65em',
          }}
        >
          {description || '\u00A0'}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: 12, letterSpacing: 0.2 }}
        >
          {sourceCountLabel}
        </Typography>

        <Box
          sx={{
            mt: 0.2,
            minHeight: notebookInfoTokens.actionRowMinHeight,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip title={copied ? '已复制' : '复制'}>
            <span>
              <IconButton
                data-testid="chat-notebook-copy-action"
                size="small"
                disabled={!canCopy}
                onClick={handleCopyNotebookInfo}
                sx={buildCopyActionButtonSx(copied)}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: notebookInfoTokens.actionIconSize, color: 'success.main' }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: notebookInfoTokens.actionIconSize }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Stack>
    </Box>
  )
}
