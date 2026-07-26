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
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '../../../shared/ui/layoutTokens'
import { inlinePreviewActionIconButtonSx } from '../../../shared/ui/previewActionStyles'
import { renderSourcePreviewContent } from '../preview/sourcePreviewRenderRegistry'
import type { SourceHighlightRange } from '../preview/sourcePreviewMarkdown'
import type { SourcePreviewViewType } from '../preview/types'
import { workspaceIconSize } from '../../../shared/ui/typeTokens'

interface SourcePreviewOverlayProps {
  open: boolean
  sourceName: string
  viewType: SourcePreviewViewType
  loading: boolean
  error: string
  notice: string
  markdown: string
  focusRange: SourceHighlightRange | null
  canDownload: boolean
  onDownload: () => void
  onClose: () => void
  onRetryLoad: () => void
}

const viewTypeLabelMap: Record<SourcePreviewViewType, string> = {
  content: '预览',
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
  canDownload,
  onDownload,
  onClose,
  onRetryLoad,
}: SourcePreviewOverlayProps) {
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
              {sourceName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: workspaceSpace.xxs, display: 'block' }}
              noWrap
            >
              {viewTypeLabelMap[viewType]}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={workspaceSpace.xxs}
            sx={{ alignItems: 'center', flexShrink: 0 }}
          >
            <Tooltip title="下载预览内容">
              <span>
                <IconButton
                  size="small"
                  aria-label="下载预览内容"
                  onClick={onDownload}
                  disabled={!canDownload}
                  sx={inlinePreviewActionIconButtonSx}
                >
                  <DownloadRoundedIcon sx={{ fontSize: workspaceIconSize.md }} />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton
              size="small"
              onClick={handleCloseOverlay}
              aria-label="关闭预览"
              sx={inlinePreviewActionIconButtonSx}
            >
              <CloseRoundedIcon sx={{ fontSize: workspaceIconSize.md }} />
            </IconButton>
          </Stack>
        </Stack>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            p: workspaceSpace.md,
            overflow: 'auto',
          }}
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
          ) : notice ? (
            <Alert severity="info">{notice}</Alert>
          ) : (
            renderSourcePreviewContent({
              viewType,
              markdown,
              focusRange,
            })
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
