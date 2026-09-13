import type { StudioArtifactKind } from '@/types/api'
import { resolveStudioArtifactDisplayTitle } from '../resolveStudioArtifactKind'

export type StudioArtifactDownloadPlan =
  | { type: 'url'; url: string; filename: string }
  | { type: 'text'; content: string; filename: string }

function buildSafeFilename(title: string, kind: StudioArtifactKind): string {
  return (
    resolveStudioArtifactDisplayTitle(title, kind)
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'studio-artifact'
  )
}

export function resolveStudioArtifactDownload(params: {
  kind: StudioArtifactKind
  title: string
  content: string
  contentUrl: string
}): StudioArtifactDownloadPlan | null {
  const { kind, title, content, contentUrl } = params
  const safeName = buildSafeFilename(title, kind)
  const url = contentUrl.trim()

  if (kind === 'info_graphic') {
    if (!url) return null
    return { type: 'url', url, filename: `${safeName}.png` }
  }

  if (kind === 'audio_overview') {
    if (!url) return null
    return { type: 'url', url, filename: `${safeName}.wav` }
  }

  if (kind === 'video_overview') {
    if (!url) return null
    return { type: 'url', url, filename: `${safeName}.mp4` }
  }

  if (kind === 'slides') {
    if (!url) return null
    return { type: 'url', url, filename: `${safeName}.pptx` }
  }

  const text = content.trim()
  if (!text) return null

  const extension =
    kind === 'mindmap'
      ? 'mmd'
      : kind === 'report' || kind === 'data_table'
        ? 'md'
        : kind === 'flashcard' || kind === 'quiz'
          ? 'json'
          : 'txt'

  return { type: 'text', content: text, filename: `${safeName}.${extension}` }
}
