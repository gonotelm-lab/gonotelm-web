import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { downloadStudioStorageFile } from '../preview/fetchStudioStorageUrl'
import { resolveStudioArtifactDownload } from '../preview/resolveStudioArtifactDownload'
import { resolveStudioArtifactDisplayTitle } from '../resolveStudioArtifactKind'
import { StudioArtifactExtrasPopover } from './StudioArtifactExtrasPopover'
import { StudioArtifactTitleBar } from './StudioArtifactTitleBar'

interface StudioArtifactPreviewOverlayProps {
  open: boolean
  artifact: StudioArtifactItem | null
  loading: boolean
  error: string
  content: string
  initialSlideIndex?: number
  onClose: () => void
  onRetryLoad: () => void
  onRenameTitle?: (title: string) => Promise<void>
  onContentUrlRefreshed?: (nextUrl: string) => void
}

export function StudioArtifactPreviewOverlay({
  open,
  artifact,
  loading,
  error,
  content,
  initialSlideIndex = 0,
  onClose,
  onRetryLoad,
  onRenameTitle,
  onContentUrlRefreshed,
}: StudioArtifactPreviewOverlayProps) {
  const { t } = useTranslation(['studio', 'common'])
  const handleCloseOverlay = useCallback(() => {
    onClose()
  }, [onClose])

  const sourceCount = useMemo(() => {
    if (!artifact) {
      return 0
    }
    return artifact.sourceIds.length || artifact.sourceCount
  }, [artifact])

  const title = artifact
    ? resolveStudioArtifactDisplayTitle(artifact.title, artifact.kind)
    : t('studio:preview.overlayTitle')
  const subtitle = artifact
    ? t('studio:preview.basedOnSources', { count: sourceCount })
    : t('studio:preview.noSourceInfo')
  const canRename = Boolean(
    artifact && artifact.status === 'completed' && onRenameTitle,
  )
  const isMindmapArtifact = artifact?.kind === 'mindmap'
  const isReportArtifact = artifact?.kind === 'report'
  const isInfographicArtifact = artifact?.kind === 'info_graphic'
  const isSlidesArtifact = artifact?.kind === 'slides'
  const isVideoArtifact = artifact?.kind === 'video_overview'
  const isFullBleedArtifact =
    isMindmapArtifact || isInfographicArtifact || isSlidesArtifact || isVideoArtifact

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
    const plan = resolveStudioArtifactDownload({
      kind: artifact.kind,
      title: artifact.title,
      content,
      contentUrl: artifact.contentUrl,
    })
    if (!plan) {
      return
    }

    if (plan.type === 'url') {
      void downloadStudioStorageFile({
        url: plan.url,
        filename: plan.filename,
        taskId: artifact.taskId,
        onUrlRefreshed: onContentUrlRefreshed,
      }).catch(() => {
        const anchor = document.createElement('a')
        anchor.href = plan.url
        anchor.download = plan.filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
      return
    }

    const blob = new Blob([plan.content], { type: 'text/plain;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = plan.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }, [artifact, content, hasDownloadableContent, onContentUrlRefreshed])

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
            flexShrink: 0,
            px: workspaceLayout.panelPaddingX,
            py: workspaceSpace.md,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {artifact ? (
              <StudioArtifactTitleBar
                title={artifact.title}
                kind={artifact.kind}
                editable={canRename}
                typographyVariant="h6"
                onCommit={async (next) => {
                  await onRenameTitle?.(next)
                }}
              />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
                {title}
              </Typography>
            )}
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
              aria-label={t('common:preview.download')}
              onClick={handleDownloadContent}
              disabled={!hasDownloadableContent}
              sx={overlayActionButtonSx}
            >
              <DownloadRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleCloseOverlay} aria-label={t('common:preview.close')} sx={overlayActionButtonSx}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Box
          sx={(theme) => ({
            flex: 1,
            minHeight: 0,
            overflow: isFullBleedArtifact ? 'hidden' : 'auto',
            ...(isFullBleedArtifact
              ? { p: 0 }
              : isReportArtifact
                ? { px: workspaceSpace.xl, py: workspaceSpace.md }
                : { p: workspaceSpace.md }),
            ...(isFullBleedArtifact ? null : subtleScrollbarSx(theme)),
          })}
        >
          {loading ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('common:preview.loading')}
              </Typography>
            </Stack>
          ) : error ? (
            <Stack spacing={workspaceLayout.listRowGap} sx={{ maxWidth: 840 }}>
              <Alert severity="error">{error}</Alert>
              <Box>
                <Button size="small" variant="outlined" onClick={onRetryLoad}>
                  {t('common:preview.retryLoad')}
                </Button>
              </Box>
            </Stack>
          ) : !artifact ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('studio:preview.empty')}
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ height: '100%', minHeight: 0 }}>
              {renderStudioArtifactPreviewContent({
                artifact,
                content,
                mode: 'overlay',
                initialSlideIndex,
                onContentUrlRefreshed,
                onRetryLoad,
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
