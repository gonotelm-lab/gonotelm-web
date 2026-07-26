import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import QuizRoundedIcon from '@mui/icons-material/QuizRounded'
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import type { StudioToolDefinition } from './types'

export const studioToolCatalog: StudioToolDefinition[] = [
  {
    id: 'audio-overview',
    title: '音频概览',
    description: '基于勾选来源生成音频概览任务',
    icon: GraphicEqRoundedIcon,
    availability: 'available',
    actionId: 'generate-audio_overview',
    artifactKind: 'audio_overview',
    hasAdvancedConfig: true,
  },
  {
    id: 'video-overview',
    title: '视频概览',
    description: '即将支持',
    icon: VideocamRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'mind-map',
    title: '思维导图',
    description: '基于勾选来源生成思维导图',
    icon: AccountTreeRoundedIcon,
    availability: 'available',
    actionId: 'generate-mindmap',
    artifactKind: 'mindmap',
    hasAdvancedConfig: true,
  },
  {
    id: 'report',
    title: '报告',
    description: '基于勾选来源生成报告',
    icon: DescriptionRoundedIcon,
    availability: 'available',
    actionId: 'generate-report',
    artifactKind: 'report',
    hasAdvancedConfig: true,
  },
  {
    id: 'flashcard',
    title: '闪卡',
    description: '基于勾选来源生成闪卡',
    icon: StyleRoundedIcon,
    availability: 'available',
    actionId: 'generate-flashcard',
    artifactKind: 'flashcard',
    hasAdvancedConfig: true,
  },
  {
    id: 'quiz',
    title: '测验',
    description: '即将支持',
    icon: QuizRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'info_graphic',
    title: '信息图',
    description: '基于勾选来源生成信息图',
    icon: ImageRoundedIcon,
    availability: 'available',
    actionId: 'generate-info_graphic',
    artifactKind: 'info_graphic',
    hasAdvancedConfig: true,
  },
  {
    id: 'slide-deck',
    title: '幻灯片',
    description: '即将支持',
    icon: SlideshowRoundedIcon,
    availability: 'coming-soon',
  },
  {
    id: 'data-table',
    title: '数据表',
    description: '即将支持',
    icon: TableChartRoundedIcon,
    availability: 'coming-soon',
  },
]
