import CloseIcon from '@mui/icons-material/Close'
import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { StudioArtifactItem } from '../types'
import { MindmapCanvas } from './MindmapCanvas'

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
  const title = artifact ? `预览 · ${artifact.title}` : '预览'

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <Stack
          direction="row"
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
              {title}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="关闭预览">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, p: 1.5, overflow: 'auto' }}>
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
          ) : !artifact ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                暂无可预览内容。
              </Typography>
            </Stack>
          ) : artifact.kind === 'mindmap' ? (
            <Paper variant="outlined" sx={{ p: 1.2, height: '100%', minHeight: 0, boxSizing: 'border-box' }}>
              <MindmapCanvas mermaid={content} spacingPreset="wide" height="100%" />
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 1.2,
                borderStyle: 'dashed',
                bgcolor: 'background.paper',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {content || '当前产物没有可展示内容。'}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
