import type { ReactNode } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { MarkdownRenderer } from '@/components/notebook-workspace/shared/markdown'
import type { StudioArtifactKind } from '@/types/api'
import type { StudioArtifactItem } from '../types'
import { FlashcardViewer } from '../components/FlashcardViewer'
import { MindmapCanvas } from '../components/MindmapCanvas'
import { QuizViewer } from '../components/QuizViewer'
import { StudioAudioPlayer } from '../components/StudioAudioPlayer'
import { workspaceSpace } from '../../../shared/ui/layoutTokens'

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
      p: workspaceSpace.md,
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
  report: {
    renderInline: ({ content }) => (
      <Box sx={{ minWidth: 0 }}>
        <MarkdownRenderer content={content} />
      </Box>
    ),
    renderOverlay: ({ content }) => (
      <Box sx={{ minWidth: 0 }}>
        <MarkdownRenderer content={content} />
      </Box>
    ),
  },
  info_graphic: {
    renderOverlay: ({ artifact }) => (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box
          component="img"
          src={artifact.contentUrl}
          alt={artifact.title || '信息图预览'}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </Box>
    ),
  },
  audio_overview: {
    renderInline: ({ artifact }) => (
      <Box sx={{ minWidth: 0 }}>
        <StudioAudioPlayer
          audioUrl={artifact.contentUrl}
          title={artifact.title}
        />
      </Box>
    ),
  },
  flashcard: {
    renderInline: ({ content, mode }) => (
      <Box sx={{ height: '100%', minHeight: 0 }}>
        <FlashcardViewer content={content} mode={mode} />
      </Box>
    ),
    renderOverlay: ({ content, mode }) => (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: workspaceSpace.lg,
          py: workspaceSpace.lg,
          boxSizing: 'border-box',
        }}
      >
        <FlashcardViewer content={content} mode={mode} />
      </Box>
    ),
  },
  quiz: {
    renderOverlay: ({ content, mode }) => (
      <Box sx={{ width: '100%', height: '100%', minHeight: 0, px: workspaceSpace.lg, py: workspaceSpace.lg, boxSizing: 'border-box' }}>
        <QuizViewer content={content} mode={mode} />
      </Box>
    ),
  },
  data_table: {
    renderInline: ({ content }) => (
      <Box sx={{ minWidth: 0 }}>
        <MarkdownRenderer content={content} />
      </Box>
    ),
    renderOverlay: ({ content }) => (
      <Box sx={{ minWidth: 0 }}>
        <MarkdownRenderer content={content} />
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
