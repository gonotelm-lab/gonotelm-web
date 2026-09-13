import i18n from '@/i18n'
import type { StudioArtifactKind } from '@/types/api'
import type { StudioToolActionId } from './types'

export const resolveStudioArtifactKind = (kind: unknown): StudioArtifactKind => {
  if (kind === 'mindmap') return 'mindmap'
  if (kind === 'report') return 'report'
  if (kind === 'info_graphic') return 'info_graphic'
  if (kind === 'audio_overview') return 'audio_overview'
  if (kind === 'video_overview') return 'video_overview'
  if (kind === 'flashcard') return 'flashcard'
  if (kind === 'quiz') return 'quiz'
  if (kind === 'data_table') return 'data_table'
  if (kind === 'slides') return 'slides'
  if (kind === 'note') return 'note'
  // Unknown kinds must not fall back to mindmap: MindmapCanvas treats every line as a node.
  return 'report'
}

export const resolveStudioArtifactActionId = (kind: StudioArtifactKind): StudioToolActionId => {
  if (kind === 'report') return 'generate-report'
  if (kind === 'info_graphic') return 'generate-info_graphic'
  if (kind === 'audio_overview') return 'generate-audio_overview'
  if (kind === 'video_overview') return 'generate-video_overview'
  if (kind === 'flashcard') return 'generate-flashcard'
  if (kind === 'quiz') return 'generate-quiz'
  if (kind === 'data_table') return 'generate-data_table'
  if (kind === 'slides') return 'generate-slides'
  if (kind === 'note') return 'save-as-note'
  return 'generate-mindmap'
}

export const resolveStudioArtifactFallbackTitle = (kind: StudioArtifactKind) => {
  if (kind === 'report') return i18n.t('studio:kind.report')
  if (kind === 'info_graphic') return i18n.t('studio:kind.infoGraphic')
  if (kind === 'audio_overview') return i18n.t('studio:kind.audioOverview')
  if (kind === 'video_overview') return i18n.t('studio:kind.videoOverview')
  if (kind === 'flashcard') return i18n.t('studio:kind.flashcard')
  if (kind === 'quiz') return i18n.t('studio:kind.quiz')
  if (kind === 'data_table') return i18n.t('studio:kind.dataTable')
  if (kind === 'slides') return i18n.t('studio:kind.slideDeck')
  if (kind === 'note') return i18n.t('studio:kind.note')
  return i18n.t('studio:kind.mindmap')
}

export const resolveStudioArtifactDisplayTitle = (
  title: string | undefined,
  kind: StudioArtifactKind,
) => {
  const normalized = String(title ?? '').trim()
  return normalized || resolveStudioArtifactFallbackTitle(kind)
}
