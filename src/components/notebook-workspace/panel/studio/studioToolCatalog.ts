import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import i18n from '@/i18n'
import type { StudioToolDefinition } from './types'

export function getStudioToolCatalog(): StudioToolDefinition[] {
  return [
    {
      id: 'audio-overview',
      title: i18n.t('studio:kind.audioOverview'),
      description: i18n.t('studio:tool.desc.audioOverview'),
      icon: GraphicEqOutlinedIcon,
      availability: 'available',
      actionId: 'generate-audio_overview',
      artifactKind: 'audio_overview',
      hasAdvancedConfig: true,
    },
    {
      id: 'video-overview',
      title: i18n.t('studio:kind.videoOverview'),
      description: i18n.t('studio:tool.desc.videoOverview'),
      icon: VideocamOutlinedIcon,
      availability: 'available',
      actionId: 'generate-video_overview',
      artifactKind: 'video_overview',
      hasAdvancedConfig: true,
    },
    {
      id: 'mind-map',
      title: i18n.t('studio:kind.mindmap'),
      description: i18n.t('studio:tool.desc.mindmap'),
      icon: AccountTreeOutlinedIcon,
      availability: 'available',
      actionId: 'generate-mindmap',
      artifactKind: 'mindmap',
      hasAdvancedConfig: true,
    },
    {
      id: 'report',
      title: i18n.t('studio:kind.report'),
      description: i18n.t('studio:tool.desc.report'),
      icon: MenuBookOutlinedIcon,
      availability: 'available',
      actionId: 'generate-report',
      artifactKind: 'report',
      hasAdvancedConfig: true,
    },
    {
      id: 'flashcard',
      title: i18n.t('studio:kind.flashcard'),
      description: i18n.t('studio:tool.desc.flashcard'),
      icon: StyleOutlinedIcon,
      availability: 'available',
      actionId: 'generate-flashcard',
      artifactKind: 'flashcard',
      hasAdvancedConfig: true,
    },
    {
      id: 'quiz',
      title: i18n.t('studio:kind.quiz'),
      description: i18n.t('studio:tool.desc.quiz'),
      icon: QuizOutlinedIcon,
      availability: 'available',
      actionId: 'generate-quiz',
      artifactKind: 'quiz',
      hasAdvancedConfig: true,
    },
    {
      id: 'info_graphic',
      title: i18n.t('studio:kind.infoGraphic'),
      description: i18n.t('studio:tool.desc.infoGraphic'),
      icon: ImageOutlinedIcon,
      availability: 'available',
      actionId: 'generate-info_graphic',
      artifactKind: 'info_graphic',
      hasAdvancedConfig: true,
    },
    {
      id: 'slide-deck',
      title: i18n.t('studio:kind.slideDeck'),
      description: i18n.t('studio:tool.desc.slides'),
      icon: SlideshowOutlinedIcon,
      availability: 'available',
      actionId: 'generate-slides',
      artifactKind: 'slides',
      hasAdvancedConfig: true,
    },
    {
      id: 'data-table',
      title: i18n.t('studio:kind.dataTable'),
      description: i18n.t('studio:tool.desc.dataTable'),
      icon: TableChartOutlinedIcon,
      availability: 'available',
      actionId: 'generate-data_table',
      artifactKind: 'data_table',
      hasAdvancedConfig: true,
    },
  ]
}
