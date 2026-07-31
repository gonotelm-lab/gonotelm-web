import { useLayoutEffect, useRef, useState } from 'react'
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
import { renderSourcePreviewContent } from '../preview/sourcePreviewRenderRegistry'
import type { SourceHighlightRange } from '../preview/sourcePreviewMarkdown'
import type { SourcePreviewViewType } from '../preview/types'
import {
  workspaceLayout,
  workspaceSpace,
} from '../../../shared/ui/layoutTokens'
import {
  inlinePreviewActionIconButtonSx,
  inlinePreviewActionIconSx,
} from '../../../shared/ui/previewActionStyles'
import { subtleScrollbarSx } from '../../../shared/ui/scrollbar'

interface SourceInlinePreviewProps {
  sourceName: string
  viewType: SourcePreviewViewType
  loading: boolean
  error: string
  notice: string
  markdown: string
  focusRange: SourceHighlightRange | null
  canOpenOverlay: boolean
  canDownload: boolean
  onOpenOverlay: () => void
  onDownload: () => void
  onRetryLoad: () => void
  /**
   * While the workspace panel is being resized, freeze preview content width
   * so markdown does not reflow every frame. Content stays mounted to preserve scroll.
   */
  degradedByResizing: boolean
}

export function SourceInlinePreview({
  sourceName,
  viewType,
  loading,
  error,
  notice,
  markdown,
  focusRange,
  canOpenOverlay,
  canDownload,
  onOpenOverlay,
  onDownload,
  onRetryLoad,
  degradedByResizing,
}: SourceInlinePreviewProps) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const [frozenWidthPx, setFrozenWidthPx] = useState<number | null>(null)

  // 不处于退化调整状态时，派生重置冻结宽度，避免 effect 中同步 setState
  if (!degradedByResizing && frozenWidthPx !== null) {
    setFrozenWidthPx(null)
  }

  useLayoutEffect(() => {
    if (degradedByResizing && frozenWidthPx === null) {
      const root = scrollRootRef.current
      if (root) {
        setFrozenWidthPx(root.clientWidth)
      }
    }
  }, [degradedByResizing, frozenWidthPx])

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }} noWrap>
            {sourceName}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={workspaceSpace.xxs}
          sx={{ ml: workspaceSpace.sm, alignItems: 'center', flexShrink: 0 }}
        >
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
        ref={scrollRootRef}
        data-source-preview-scroll-root="true"
        data-preview-layout-frozen={frozenWidthPx != null ? 'true' : 'false'}
        sx={(theme) => ({
          mt: workspaceSpace.md,
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          overflowX: frozenWidthPx != null ? 'hidden' : 'auto',
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
        ) : notice ? (
          <Alert severity="info">{notice}</Alert>
        ) : (
          <Box
            data-testid="source-inline-preview-body"
            sx={{
              boxSizing: 'border-box',
              width: frozenWidthPx ?? '100%',
              ...(frozenWidthPx != null
                ? {
                    minWidth: frozenWidthPx,
                    maxWidth: frozenWidthPx,
                  }
                : null),
            }}
          >
            {renderSourcePreviewContent({
              viewType,
              markdown,
              focusRange,
            })}
          </Box>
        )}
      </Box>
    </Stack>
  )
}
