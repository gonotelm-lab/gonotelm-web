import type { ReactNode } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { MarkdownRenderer } from '@/components/notebook-workspace/shared/markdown'
import type { StudioArtifactKind } from '@/types/api'
import type { StudioArtifactItem } from '../types'
import { FlashcardViewer } from '../components/FlashcardViewer'
import { MindmapCanvas } from '../components/MindmapCanvas'
import { QuizViewer } from '../components/QuizViewer'
import { StudioAudioPlayer } from '../components/StudioAudioPlayer'
import { StudioVideoPlayer } from '../components/StudioVideoPlayer'
import { StudioSlidesViewer } from '../slides/StudioSlidesViewer'
import { workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceType } from '@/components/notebook-workspace/shared/ui/typeTokens'
import i18n from '@/i18n'

export type StudioArtifactPreviewMode = 'inline' | 'overlay'

interface StudioArtifactPreviewRenderContext {
  artifact: StudioArtifactItem
  content: string
  mode: StudioArtifactPreviewMode
  /** inline → 点击某一页打开 overlay 时回调（0-based） */
  onOpenOverlayAtSlide?: (slideIndex: number) => void
  /** overlay 初始定位页（0-based） */
  initialSlideIndex?: number
  onContentUrlRefreshed?: (nextUrl: string) => void
  onRetryLoad?: () => void
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
        fontSize: workspaceType.sm,
        lineHeight: 1.5,
        color: 'text.primary',
      }}
    >
      {content || i18n.t('studio:preview.emptyDisplay')}
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
          alt={artifact.title || i18n.t('studio:preview.infoGraphicAlt')}
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
  video_overview: {
    renderInline: ({ artifact, onRetryLoad }) => (
      <Box sx={{ width: '100%', height: '100%', minHeight: 0 }}>
        <StudioVideoPlayer
          key={artifact.id}
          videoUrl={artifact.contentUrl}
          title={artifact.title}
          playbackKey={artifact.id}
          mode="inline"
          onRetry={onRetryLoad}
        />
      </Box>
    ),
    renderOverlay: ({ artifact, onRetryLoad }) => (
      <Box sx={{ width: '100%', height: '100%', minHeight: 0 }}>
        <StudioVideoPlayer
          key={artifact.id}
          videoUrl={artifact.contentUrl}
          title={artifact.title}
          playbackKey={artifact.id}
          mode="overlay"
          onRetry={onRetryLoad}
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
  slides: {
    renderInline: ({ artifact, onOpenOverlayAtSlide, onContentUrlRefreshed }) => (
      <StudioSlidesViewer
        artifact={artifact}
        mode="inline"
        onOpenOverlayAtSlide={onOpenOverlayAtSlide}
        onContentUrlRefreshed={onContentUrlRefreshed}
      />
    ),
    renderOverlay: ({ artifact, initialSlideIndex, onContentUrlRefreshed }) => (
      <StudioSlidesViewer
        artifact={artifact}
        mode="overlay"
        initialSlideIndex={initialSlideIndex}
        onContentUrlRefreshed={onContentUrlRefreshed}
      />
    ),
  },
  note: {
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
  onOpenOverlayAtSlide,
  initialSlideIndex,
  onContentUrlRefreshed,
  onRetryLoad,
}: StudioArtifactPreviewRenderContext) => {
  const renderer = previewRendererByKind[artifact.kind]
  if (!renderer) {
    return renderFallbackPreview(content)
  }
  if (mode === 'inline' && renderer.renderInline) {
    return renderer.renderInline({
      artifact,
      content,
      mode,
      onOpenOverlayAtSlide,
      initialSlideIndex,
      onContentUrlRefreshed,
      onRetryLoad,
    })
  }
  if (mode === 'overlay' && renderer.renderOverlay) {
    return renderer.renderOverlay({
      artifact,
      content,
      mode,
      onOpenOverlayAtSlide,
      initialSlideIndex,
      onContentUrlRefreshed,
      onRetryLoad,
    })
  }
  return renderFallbackPreview(content)
}
