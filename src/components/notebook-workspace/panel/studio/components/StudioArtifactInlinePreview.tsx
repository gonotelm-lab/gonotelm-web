import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ZoomOutMapRoundedIcon from '@mui/icons-material/ZoomOutMapRounded'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { StudioArtifactItem } from '../types'
import { renderStudioArtifactPreviewContent } from '../preview/previewRenderRegistry'
import { workspaceLayout, workspaceSpace } from '../../../shared/ui/layoutTokens'
import {
  inlinePreviewActionIconButtonSx,
  inlinePreviewActionIconSx,
} from '../../../shared/ui/previewActionStyles'
import { subtleScrollbarSx } from '../../../shared/ui/scrollbar'
import { resolveStudioArtifactDisplayTitle } from '../resolveStudioArtifactKind'
import { StudioArtifactExtrasPopover } from './StudioArtifactExtrasPopover'
import { StudioArtifactTitleBar } from './StudioArtifactTitleBar'
import { StudioAudioPlayer } from './StudioAudioPlayer'

interface StudioArtifactInlinePreviewProps {
  artifact: StudioArtifactItem
  loading: boolean
  error: string
  content: string
  canOpenOverlay: boolean
  onOpenOverlay: () => void
  onDownload: () => void
  onRetryLoad: () => void
  onRenameTitle?: (title: string) => Promise<void>
}

export function StudioArtifactInlinePreview({
  artifact,
  loading,
  error,
  content,
  canOpenOverlay,
  onOpenOverlay,
  onDownload,
  onRetryLoad,
  onRenameTitle,
}: StudioArtifactInlinePreviewProps) {
  const sourceCount = artifact.sourceIds.length || artifact.sourceCount
  const isAudioOverviewArtifact = artifact.kind === 'audio_overview'
  const hasDownloadableContent = isAudioOverviewArtifact
    ? Boolean(artifact.contentUrl.trim())
    : Boolean(content.trim())
  const canDownload = !loading && !error && hasDownloadableContent
  const isMindmapArtifact = artifact.kind === 'mindmap'
  const isFlashcardArtifact = artifact.kind === 'flashcard'
  const displayTitle = resolveStudioArtifactDisplayTitle(artifact.title, artifact.kind)
  const canRename = artifact.status === 'completed' && Boolean(onRenameTitle)

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack
        direction="row"
        sx={{
          flexShrink: 0,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          bgcolor: 'background.paper',
          pb: workspaceSpace.sm,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <StudioArtifactTitleBar
            title={artifact.title}
            kind={artifact.kind}
            editable={canRename}
            typographyVariant="h5"
            onCommit={async (next) => {
              await onRenameTitle?.(next)
            }}
          />
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mt: workspaceSpace.xxs }}
          >
            基于 {sourceCount} 个来源
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={workspaceSpace.xxs}
          sx={{ ml: workspaceSpace.sm, alignItems: 'center', flexShrink: 0 }}
        >
          <StudioArtifactExtrasPopover
            artifact={artifact}
            iconSx={inlinePreviewActionIconButtonSx}
          />
          {canOpenOverlay ? (
            <Tooltip title="放大预览">
              <span>
                <IconButton
                  size="small"
                  aria-label="放大预览"
                  onClick={onOpenOverlay}
                  sx={inlinePreviewActionIconButtonSx}
                >
                  <ZoomOutMapRoundedIcon sx={inlinePreviewActionIconSx} />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          <Tooltip title="下载预览内容">
            <span>
              <IconButton
                size="small"
                aria-label="下载预览内容"
                onClick={onDownload}
                disabled={!canDownload}
                sx={inlinePreviewActionIconButtonSx}
              >
                <DownloadRoundedIcon sx={inlinePreviewActionIconSx} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        sx={(theme) => ({
          flex: 1,
          minHeight: 0,
          overflow: isMindmapArtifact || isFlashcardArtifact ? 'hidden' : 'auto',
          ...(isMindmapArtifact || isFlashcardArtifact ? null : subtleScrollbarSx(theme)),
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
        ) : (
          isAudioOverviewArtifact ? (
            <StudioAudioPlayer
              audioUrl={artifact.contentUrl}
              title={displayTitle}
              onRetry={onRetryLoad}
              onDownload={onDownload}
            />
          ) : (
            renderStudioArtifactPreviewContent({
              artifact,
              content,
              mode: 'inline',
            })
          )
        )}
      </Box>
    </Stack>
  )
}
