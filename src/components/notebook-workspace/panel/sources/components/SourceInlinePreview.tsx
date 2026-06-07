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
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { renderSourcePreviewContent } from '../preview/sourcePreviewRenderRegistry'
import type { SourceHighlightRange } from '../preview/sourcePreviewMarkdown'
import type { SourcePreviewViewType } from '../preview/types'
import {
  inlinePreviewActionIconButtonSx,
  inlinePreviewActionIconSx,
} from '../../../shared/ui/previewActionStyles'

interface SourceInlinePreviewProps {
  sourceName: string
  viewType: SourcePreviewViewType
  loading: boolean
  error: string
  notice: string
  markdown: string
  focusRange: SourceHighlightRange | null
  tree: GetSourceParsedTreeResponse | null
  canOpenOverlay: boolean
  canDownload: boolean
  onOpenOverlay: () => void
  onDownload: () => void
  onRetryLoad: () => void
  degradedByResizing: boolean
}

const viewTypeLabelMap: Record<SourcePreviewViewType, string> = {
  content: '预览',
  tree: '展示',
}

export function SourceInlinePreview({
  sourceName,
  viewType,
  loading,
  error,
  notice,
  markdown,
  focusRange,
  tree,
  canOpenOverlay,
  canDownload,
  onOpenOverlay,
  onDownload,
  onRetryLoad,
  degradedByResizing,
}: SourceInlinePreviewProps) {
  const isTreeView = viewType === 'tree'

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }} noWrap>
            {sourceName}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.55 }}>
            {viewTypeLabelMap[viewType]}
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
                  sx={inlinePreviewActionIconButtonSx}
                >
                  <ZoomOutMapRoundedIcon sx={inlinePreviewActionIconSx} />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {!isTreeView ? (
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
          ) : null}
        </Stack>
      </Stack>

      <Box
        data-source-preview-scroll-root={isTreeView ? undefined : 'true'}
        sx={{ mt: 1.2, flex: 1, minHeight: 0, overflow: isTreeView ? 'hidden' : 'auto' }}
      >
        {degradedByResizing ? (
          <Box
            sx={{
              height: '100%',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              拖拽中已启用轻量预览，松开后恢复完整内容
            </Typography>
          </Box>
        ) : loading ? (
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
    </Stack>
  )
}
