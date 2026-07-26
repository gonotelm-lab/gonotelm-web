import { useCallback, useMemo } from 'react'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '../../../shared/ui/layoutTokens'
import { subtleScrollbarSx } from '../../../shared/ui/scrollbar'
import type { StudioArtifactItem } from '../types'
import { renderStudioArtifactPreviewContent } from '../preview/previewRenderRegistry'
import { hasStudioArtifactPreviewContent } from '../preview/previewContent'
import { downloadFileFromUrl } from '../preview/downloadFile'
import { StudioArtifactExtrasPopover } from './StudioArtifactExtrasPopover'

interface StudioArtifactPreviewOverlayProps {
  open: boolean
  artifact: StudioArtifactItem | null
  loading: boolean
  error: string
  content: string
  onClose: () => void
  onRetryLoad: () => void
}

export function StudioArtifactPreviewOverlay({
  open,
  artifact,
  loading,
  error,
  content,
  onClose,
  onRetryLoad,
}: StudioArtifactPreviewOverlayProps) {
  const handleCloseOverlay = useCallback(() => {
    onClose()
  }, [onClose])

  const sourceCount = useMemo(() => {
    if (!artifact) {
      return 0
    }
    return artifact.sourceIds.length || artifact.sourceCount
  }, [artifact])

  const title = artifact?.title || '产物预览'
  const subtitle = artifact ? `基于 ${sourceCount} 个来源` : '暂无来源信息'
  const isMindmapArtifact = artifact?.kind === 'mindmap'
  const isReportArtifact = artifact?.kind === 'report'
  const isInfographicArtifact = artifact?.kind === 'info_graphic'

  const hasDownloadableContent = artifact
    ? hasStudioArtifactPreviewContent(artifact.kind, content, artifact.contentUrl)
    : false
  const overlayActionButtonSx = {
    color: 'text.secondary',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  }

  const handleDownloadContent = useCallback(() => {
    if (!artifact || !hasDownloadableContent) {
      return
    }
    const safeName = artifact.title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'studio-artifact'

    if (artifact.kind === 'info_graphic') {
      void downloadFileFromUrl(artifact.contentUrl, `${safeName}.png`).catch(() => {
        // Fallback keeps current behavior when cross-origin download is blocked.
        const anchor = document.createElement('a')
        anchor.href = artifact.contentUrl
        anchor.download = `${safeName}.png`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
      return
    }

    if (artifact.kind === 'audio_overview') {
      const audioUrl = artifact.contentUrl
      if (!audioUrl.trim()) return
      void downloadFileFromUrl(audioUrl, `${safeName}.wav`).catch(() => {
        const anchor = document.createElement('a')
        anchor.href = audioUrl
        anchor.download = `${safeName}.wav`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
      return
    }

    const extension = artifact.kind === 'mindmap'
      ? 'mmd'
      : artifact.kind === 'report' || artifact.kind === 'data_table'
        ? 'md'
        : artifact.kind === 'flashcard' || artifact.kind === 'quiz'
          ? 'json'
          : 'txt'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = `${safeName}.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }, [artifact, content, hasDownloadableContent])

  return (
    <Dialog
      open={open}
      onClose={handleCloseOverlay}
      fullWidth
      maxWidth={false}
      slotProps={{
        backdrop: {
          sx: (theme) => ({
            bgcolor: alpha(
              theme.palette.primary.dark,
              theme.workspacePalette.overlay.backdropAlpha,
            ),
          }),
        },
        paper: {
          sx: {
            width: 'calc(100vw - 32px)',
            height: 'calc(100dvh - 32px)',
            maxWidth: 'none',
            maxHeight: 'calc(100dvh - 32px)',
            m: 0,
            borderRadius: workspaceRadius.lg,
            border: 'none',
            boxShadow: 'none',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            color: 'text.primary',
          },
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack
          direction="row"
          sx={{
            px: workspaceLayout.panelPaddingY,
            py: workspaceSpace.md,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
              {title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: workspaceSpace.xxs, display: 'block' }}
              noWrap
            >
              {subtitle}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={workspaceSpace.sm}
            sx={{ alignItems: 'center', flexShrink: 0, ml: workspaceSpace.md }}
          >
            {artifact && (
              <StudioArtifactExtrasPopover
                artifact={artifact}
                iconSx={overlayActionButtonSx}
              />
            )}
            <IconButton
              size="small"
              aria-label="下载预览内容"
              onClick={handleDownloadContent}
              disabled={!hasDownloadableContent}
              sx={overlayActionButtonSx}
            >
              <DownloadRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleCloseOverlay} aria-label="关闭预览" sx={overlayActionButtonSx}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Box
          sx={(theme) => ({
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            ...(isMindmapArtifact || isInfographicArtifact
              ? { p: 0 }
              : isReportArtifact
                ? { px: workspaceSpace.xl, py: workspaceSpace.md }
                : { p: workspaceSpace.md }),
            ...subtleScrollbarSx(theme),
          })}
        >
          {loading ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                正在加载预览内容...
              </Typography>
            </Stack>
          ) : error ? (
            <Stack spacing={workspaceLayout.listRowGap} sx={{ maxWidth: 840 }}>
              <Alert severity="error">{error}</Alert>
              <Box>
                <Button size="small" variant="outlined" onClick={onRetryLoad}>
                  重试加载
                </Button>
              </Box>
            </Stack>
          ) : !artifact ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                暂无可预览内容。
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ height: '100%', minHeight: 0 }}>
              {renderStudioArtifactPreviewContent({
                artifact,
                content,
                mode: 'overlay',
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
