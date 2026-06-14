import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { renderSourcePreviewContent } from '../preview/sourcePreviewRenderRegistry'
import type { SourceHighlightRange } from '../preview/sourcePreviewMarkdown'
import type { SourcePreviewViewType } from '../preview/types'

interface SourcePreviewOverlayProps {
  open: boolean
  sourceName: string
  viewType: SourcePreviewViewType
  loading: boolean
  error: string
  notice: string
  markdown: string
  focusRange: SourceHighlightRange | null
  tree: GetSourceParsedTreeResponse | null
  canDownload: boolean
  onDownload: () => void
  onClose: () => void
  onRetryLoad: () => void
}

const viewTypeLabelMap: Record<SourcePreviewViewType, string> = {
  content: '预览',
  tree: '展示',
}

export function SourcePreviewOverlay({
  open,
  sourceName,
  viewType,
  loading,
  error,
  notice,
  markdown,
  focusRange,
  tree,
  canDownload,
  onDownload,
  onClose,
  onRetryLoad,
}: SourcePreviewOverlayProps) {
  const isTreeView = viewType === 'tree'
  const handleCloseOverlay = () => {
    onClose()
  }

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
            borderRadius: 1.6,
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
            px: 2.2,
            py: 1.3,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
              {sourceName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.25, display: 'block' }}
              noWrap
            >
              {viewTypeLabelMap[viewType]}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {!isTreeView ? (
              <Tooltip title="下载预览内容">
                <span>
                  <IconButton
                    size="small"
                    aria-label="下载预览内容"
                    onClick={onDownload}
                    disabled={!canDownload}
                    sx={{ p: 0.45 }}
                  >
                    <DownloadRoundedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
            <IconButton size="small" onClick={handleCloseOverlay} aria-label="关闭预览" sx={{ p: 0.45 }}>
              <CloseRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Stack>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, p: isTreeView ? 0 : 1.4, overflow: 'auto' }}>
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
          ) : notice ? (
            <Alert severity="info">{notice}</Alert>
          ) : (
            renderSourcePreviewContent({
              viewType,
              markdown,
              focusRange,
              tree,
            })
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
