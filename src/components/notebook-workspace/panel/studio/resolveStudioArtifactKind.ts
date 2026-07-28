import type { StudioArtifactKind } from '@/types/api'
import type { StudioToolActionId } from './types'

export const resolveStudioArtifactKind = (kind: unknown): StudioArtifactKind => {
  if (kind === 'mindmap') return 'mindmap'
  if (kind === 'report') return 'report'
  if (kind === 'info_graphic') return 'info_graphic'
  if (kind === 'audio_overview') return 'audio_overview'
  if (kind === 'flashcard') return 'flashcard'
  if (kind === 'quiz') return 'quiz'
  if (kind === 'data_table') return 'data_table'
  if (kind === 'note') return 'note'
  // Unknown kinds must not fall back to mindmap: MindmapCanvas treats every line as a node.
  return 'report'
}

export const resolveStudioArtifactActionId = (kind: StudioArtifactKind): StudioToolActionId => {
  if (kind === 'report') return 'generate-report'
  if (kind === 'info_graphic') return 'generate-info_graphic'
  if (kind === 'audio_overview') return 'generate-audio_overview'
  if (kind === 'flashcard') return 'generate-flashcard'
  if (kind === 'quiz') return 'generate-quiz'
  if (kind === 'data_table') return 'generate-data_table'
  if (kind === 'note') return 'save-as-note'
  return 'generate-mindmap'
}

export const resolveStudioArtifactFallbackTitle = (kind: StudioArtifactKind) => {
  if (kind === 'report') return '报告'
  if (kind === 'info_graphic') return '信息图'
  if (kind === 'audio_overview') return '音频概览'
  if (kind === 'flashcard') return '闪卡'
  if (kind === 'quiz') return '测验'
  if (kind === 'data_table') return '数据表'
  if (kind === 'note') return '笔记'
  return '思维导图'
}

export const resolveStudioArtifactDisplayTitle = (
  title: string | undefined,
  kind: StudioArtifactKind,
) => {
  const normalized = String(title ?? '').trim()
  return normalized || resolveStudioArtifactFallbackTitle(kind)
}
