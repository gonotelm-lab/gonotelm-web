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
import {
  inlinePreviewActionIconButtonSx,
  inlinePreviewActionIconSx,
} from '../../../shared/ui/previewActionStyles'
import { StudioArtifactExtrasPopover } from './StudioArtifactExtrasPopover'
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
}: StudioArtifactInlinePreviewProps) {
  const sourceCount = artifact.sourceIds.length || artifact.sourceCount
  const isAudioOverviewArtifact = artifact.kind === 'audio_overview'
  const hasDownloadableContent = isAudioOverviewArtifact
    ? Boolean(artifact.contentUrl.trim())
    : Boolean(content.trim())
  const canDownload = !loading && !error && hasDownloadableContent
  const isMindmapArtifact = artifact.kind === 'mindmap'
  const isFlashcardArtifact = artifact.kind === 'flashcard'

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }} noWrap>
            {artifact.title}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.55 }}>
            基于 {sourceCount} 个来源
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.35} sx={{ ml: 1, alignItems: 'center', flexShrink: 0 }}>
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
        sx={{
          mt: 1.2,
          flex: 1,
          minHeight: 0,
          overflow: isMindmapArtifact || isFlashcardArtifact ? 'hidden' : 'auto',
        }}
      >
        {loading ? (
          <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              正在加载预览内容...
            </Typography>
          </Stack>
        ) : error ? (
          <Stack spacing={1.2} sx={{ maxWidth: 840 }}>
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
              title={artifact.title}
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
