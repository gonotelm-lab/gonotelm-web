import type { SvgIconComponent } from '@mui/icons-material'
import type {
  AudioOverviewArtifactExtras,
  DataTableArtifactExtras,
  FlashcardArtifactExtras,
  InfoGraphicArtifactExtras,
  MindmapArtifactExtras,
  NoteArtifactExtras,
  QuizArtifactExtras,
  ReportArtifactExtras,
  StudioArtifactContentKind,
  StudioArtifactKind,
  StudioArtifactTaskStatus,
} from '@/types/api'

export type StudioArtifactExtras =
  | MindmapArtifactExtras
  | ReportArtifactExtras
  | InfoGraphicArtifactExtras
  | AudioOverviewArtifactExtras
  | FlashcardArtifactExtras
  | QuizArtifactExtras
  | DataTableArtifactExtras
  | NoteArtifactExtras

export type StudioToolActionId =
  | 'generate-mindmap'
  | 'generate-report'
  | 'generate-info_graphic'
  | 'generate-audio_overview'
  | 'generate-flashcard'
  | 'generate-quiz'
  | 'generate-data_table'
  | 'save-as-note'

export interface SaveMessageAsNoteParams {
  chatId: string
  msgId: string
}

export type StudioToolAvailability = 'available' | 'coming-soon'

export interface StudioToolDefinition {
  id: string
  title: string
  description: string
  icon: SvgIconComponent
  availability: StudioToolAvailability
  actionId?: StudioToolActionId
  artifactKind?: StudioArtifactKind
  hasAdvancedConfig?: boolean
}

export interface StudioArtifactItem {
  id: string
  taskId: string
  kind: StudioArtifactKind
  actionId: StudioToolActionId
  title: string
  status: StudioArtifactTaskStatus
  sourceCount: number
  sourceIds: string[]
  content: string
  contentUrl: string
  contentKind: StudioArtifactContentKind
  infoGraphicExtras?: InfoGraphicArtifactExtras
  extras?: StudioArtifactExtras
  error: string
  createdAt: number
}
