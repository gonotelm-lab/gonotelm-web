import type { SvgIconComponent } from '@mui/icons-material'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import type { StudioArtifactKind } from '@/types/api'

export const artifactKindIconMap: Record<StudioArtifactKind, SvgIconComponent> = {
  mindmap: AccountTreeOutlinedIcon,
  report: MenuBookOutlinedIcon,
  info_graphic: ImageOutlinedIcon,
  audio_overview: GraphicEqOutlinedIcon,
  video_overview: VideocamOutlinedIcon,
  flashcard: StyleOutlinedIcon,
  quiz: QuizOutlinedIcon,
  data_table: TableChartOutlinedIcon,
  note: StickyNote2OutlinedIcon,
  slides: SlideshowOutlinedIcon,
}
