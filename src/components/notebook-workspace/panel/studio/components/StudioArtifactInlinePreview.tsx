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
  const hasDownloadableContent = Boolean(content.trim())
  const canDownload = !loading && !error && hasDownloadableContent
  const isMindmapArtifact = artifact.kind === 'mindmap'
  const actionIconButtonSx = { p: 0.45 }
  const actionIconSx = { fontSize: 17 }

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
          {canOpenOverlay ? (
            <Tooltip title="放大预览">
              <span>
                <IconButton
                  size="small"
                  aria-label="放大预览"
                  onClick={onOpenOverlay}
                  sx={actionIconButtonSx}
                >
                  <ZoomOutMapRoundedIcon sx={actionIconSx} />
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
                sx={actionIconButtonSx}
              >
                <DownloadRoundedIcon sx={actionIconSx} />
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
          overflow: isMindmapArtifact ? 'hidden' : 'auto',
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
          renderStudioArtifactPreviewContent({
            artifact,
            content,
            mode: 'inline',
          })
        )}
      </Box>
    </Stack>
  )
}
