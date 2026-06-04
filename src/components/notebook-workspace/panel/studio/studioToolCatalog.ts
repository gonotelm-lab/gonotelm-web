import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded'
import QuizRoundedIcon from '@mui/icons-material/QuizRounded'
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import type { StudioToolDefinition } from './types'

export const studioToolCatalog: StudioToolDefinition[] = [
  {
    id: 'audio-overview',
    title: 'Audio Overview',
    description: '即将支持',
    icon: GraphicEqRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'video-overview',
    title: 'Video Overview',
    description: '即将支持',
    icon: VideocamRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'mind-map',
    title: 'Mind Map',
    description: '基于勾选来源生成思维导图',
    icon: AccountTreeRoundedIcon,
    availability: 'available',
    actionId: 'generate-mindmap',
    artifactKind: 'mindmap',
  },
  {
    id: 'reports',
    title: 'Reports',
    description: '即将支持',
    icon: DescriptionRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: '即将支持',
    icon: StyleRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    description: '即将支持',
    icon: QuizRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'infographic',
    title: 'Infographic',
    description: '即将支持',
    icon: BarChartRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'slide-deck',
    title: 'Slide Deck',
    description: '即将支持',
    icon: SlideshowRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'data-table',
    title: 'Data Table',
    description: '即将支持',
    icon: TableChartRoundedIcon,
    availability: 'coming-soon',
  },
]
