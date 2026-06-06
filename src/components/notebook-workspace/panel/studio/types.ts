import type { SvgIconComponent } from '@mui/icons-material'
import type {
  StudioArtifactContentKind,
  StudioArtifactKind,
  StudioArtifactTaskStatus,
} from '@/types/api'

export type StudioToolActionId = 'generate-mindmap' | 'generate-report'

export type StudioToolAvailability = 'available' | 'coming-soon'

export interface StudioToolDefinition {
  id: string
  title: string
  description: string
  icon: SvgIconComponent
  availability: StudioToolAvailability
  actionId?: StudioToolActionId
  artifactKind?: StudioArtifactKind
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
  error: string
  createdAt: number
}
