import { useCallback, useEffect, useRef, useState } from 'react'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import { Box, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { chatMessageContentTokens } from './layoutTokens'
import { workspaceRadiusPx, workspaceSpace } from '../../shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../../shared/ui/motionTokens'
import { workspaceIconSize, workspaceType, workspaceTypeRem } from '../../shared/ui/typeTokens'

const notebookInfoTokens = {
  marginTop: 0,
  iconSlotSize: 34,
  iconSlotRadius: workspaceRadiusPx.md,
  iconSlotBorderColor: 'divider',
  iconColor: 'text.secondary',
  titleLineClamp: 2,
  actionRowMinHeight: 28,
  actionIconSize: 16,
}

const fallbackNotebookName = 'Untitled notebook'

const buildCopyActionButtonSx = (copied: boolean) => (theme: Theme) => ({
  p: 0,
  borderRadius: 0,
  color: copied ? theme.workspacePalette.status.success : 'text.disabled',
  bgcolor: 'transparent',
  transition: workspaceTransitionPresets.interactiveColorBorder,
  '&:hover': {
    bgcolor: 'transparent',
    color: copied ? theme.workspacePalette.status.success : 'text.secondary',
  },
})

interface ChatNotebookInfoHeaderProps {
  notebookName: string
  notebookDescription: string
  notebookSourceCount: number
  /** 是否为作者自定义摘要；false 表示展示中的摘要来自 AI。 */
  customizeDescription?: boolean
  descriptionLoading?: boolean
}

export function ChatNotebookInfoHeader({
  notebookName,
  notebookDescription,
  notebookSourceCount,
  customizeDescription = false,
  descriptionLoading = false,
}: ChatNotebookInfoHeaderProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [copied, setCopied] = useState(false)
  const copyResetTimerRef = useRef<number | null>(null)
  const clearCopyResetTimer = useCallback(() => {
    if (copyResetTimerRef.current) {
      window.clearTimeout(copyResetTimerRef.current)
      copyResetTimerRef.current = null
    }
  }, [])
  const title = notebookName.trim() || fallbackNotebookName
  const description = notebookDescription.trim()
  const normalizedCount =
    Number.isFinite(notebookSourceCount) && notebookSourceCount > 0
      ? Math.floor(notebookSourceCount)
      : 0
  const sourceCountLabel = t('common:sourceCount', { count: normalizedCount })
  // 自定义模式始终展示来源标识；AI 模式仅在已有摘要时展示，避免空摘要仍声称「由 AI 生成」。
  const showDescriptionOrigin = customizeDescription || description.length > 0
  const descriptionOriginLabel = customizeDescription
    ? t('chat:notebookInfo.descriptionByAuthor')
    : t('chat:notebookInfo.descriptionByAi')
  const copyPayload = [title, description, sourceCountLabel]
    .filter((part) => part.trim().length > 0)
    .join('\n')
  const canCopy = Boolean(copyPayload.trim())

  const handleCopyNotebookInfo = useCallback(() => {
    if (!canCopy) return
    void navigator.clipboard.writeText(copyPayload).then(() => {
      setCopied(true)
      clearCopyResetTimer()
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copyResetTimerRef.current = null
      }, 1200)
    }).catch(() => {
      setCopied(false)
    })
  }, [canCopy, clearCopyResetTimer, copyPayload])

  useEffect(() => {
    return clearCopyResetTimer
  }, [clearCopyResetTimer])

  return (
    <Box
      data-testid="chat-notebook-info-header"
      sx={{
        mt: notebookInfoTokens.marginTop,
        ml: chatMessageContentTokens.sideMarginX,
        mr: chatMessageContentTokens.sideMarginX,
      }}
    >
      <Stack spacing={workspaceSpace.sm} sx={{ minWidth: 0, flex: 1 }}>
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
          <DescriptionOutlinedIcon sx={{ fontSize: workspaceIconSize.md, color: notebookInfoTokens.iconColor }} />
        </Box>

        <Typography
          variant="h5"
          component="h2"
          sx={{
            minWidth: 0,
            // Keep title on Geist UI scale — oversized display + tracking makes CJK look uneven.
            fontSize: { xs: workspaceTypeRem.xl, md: '1.5rem' },
            lineHeight: 1.35,
            fontWeight: 600,
            letterSpacing: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: notebookInfoTokens.titleLineClamp,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </Typography>

        {descriptionLoading ? (
          <Stack spacing={0.75} sx={{ width: '100%', minHeight: '1.6em' }}>
            <Skeleton
              data-testid="chat-notebook-description-skeleton"
              animation="wave"
              variant="rounded"
              width="88%"
              height={14}
            />
            <Skeleton
              animation="wave"
              variant="rounded"
              width="72%"
              height={14}
            />
            <Skeleton
              animation="wave"
              variant="rounded"
              width="56%"
              height={14}
            />
          </Stack>
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              width: '100%',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              textAlign: 'left',
              letterSpacing: 0,
              minHeight: '1.6em',
            }}
          >
            {description || '\u00A0'}
          </Typography>
        )}

        <Stack
          direction="row"
          spacing={workspaceSpace.sm}
          sx={{ alignItems: 'center', minWidth: 0 }}
        >
          {showDescriptionOrigin ? (
            <Tooltip title={descriptionOriginLabel}>
              <Box
                component="span"
                data-testid={
                  customizeDescription
                    ? 'chat-notebook-description-origin-author'
                    : 'chat-notebook-description-origin-ai'
                }
                aria-label={descriptionOriginLabel}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'text.secondary',
                  lineHeight: 0,
                }}
              >
                {customizeDescription ? (
                  <PersonOutlineOutlinedIcon sx={{ fontSize: workspaceIconSize.sm }} />
                ) : (
                  <AutoAwesomeOutlinedIcon sx={{ fontSize: workspaceIconSize.sm }} />
                )}
              </Box>
            </Tooltip>
          ) : null}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: workspaceType.xs, letterSpacing: 0 }}
          >
            {sourceCountLabel}
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: workspaceSpace.xxs,
            minHeight: notebookInfoTokens.actionRowMinHeight,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip title={copied ? t('common:action.copied') : t('common:action.copy')}>
            <span>
              <IconButton
                data-testid="chat-notebook-copy-action"
                size="small"
                disabled={!canCopy}
                onClick={handleCopyNotebookInfo}
                sx={buildCopyActionButtonSx(copied)}
              >
                {copied ? (
                  <CheckIcon
                    sx={(theme) => ({
                      fontSize: notebookInfoTokens.actionIconSize,
                      color: theme.workspacePalette.status.success,
                    })}
                  />
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
