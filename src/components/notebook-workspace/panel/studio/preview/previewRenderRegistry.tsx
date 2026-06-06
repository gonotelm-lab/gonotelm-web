import type { ReactNode } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import type { StudioArtifactKind } from '@/types/api'
import type { StudioArtifactItem } from '../types'
import { MindmapCanvas } from '../components/MindmapCanvas'

export type StudioArtifactPreviewMode = 'inline' | 'overlay'

interface StudioArtifactPreviewRenderContext {
  artifact: StudioArtifactItem
  content: string
  mode: StudioArtifactPreviewMode
}

interface StudioArtifactPreviewRenderer {
  renderInline?: (context: StudioArtifactPreviewRenderContext) => ReactNode
  renderOverlay?: (context: StudioArtifactPreviewRenderContext) => ReactNode
}

const renderFallbackPreview = (content: string) => (
  <Paper
    variant="outlined"
    sx={{
      p: 1.2,
      borderStyle: 'dashed',
      bgcolor: 'background.default',
      borderColor: 'divider',
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
        color: 'text.primary',
      }}
    >
      {content || '当前产物没有可展示内容。'}
    </Typography>
  </Paper>
)

const previewRendererByKind: Partial<Record<StudioArtifactKind, StudioArtifactPreviewRenderer>> = {
  mindmap: {
    renderInline: ({ content }) => (
      <Box sx={{ height: '100%', minHeight: 0 }}>
        <MindmapCanvas
          mermaid={content}
          spacingPreset="wide"
          surfaceRadius={0}
          showBorder={false}
          height="100%"
        />
      </Box>
    ),
    renderOverlay: ({ content }) => (
      <Box sx={{ height: '100%', minHeight: 0 }}>
        <MindmapCanvas
          mermaid={content}
          spacingPreset="wide"
          surfaceRadius={0}
          showBorder={false}
          height="100%"
        />
      </Box>
    ),
  },
}

export const renderStudioArtifactPreviewContent = ({
  artifact,
  content,
  mode,
}: StudioArtifactPreviewRenderContext) => {
  const renderer = previewRendererByKind[artifact.kind]
  if (!renderer) {
    return renderFallbackPreview(content)
  }
  if (mode === 'inline' && renderer.renderInline) {
    return renderer.renderInline({ artifact, content, mode })
  }
  if (mode === 'overlay' && renderer.renderOverlay) {
    return renderer.renderOverlay({ artifact, content, mode })
  }
  return renderFallbackPreview(content)
}
