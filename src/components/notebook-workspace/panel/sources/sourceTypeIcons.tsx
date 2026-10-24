import type { SvgIconComponent } from '@mui/icons-material'
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import type { SourceIconType } from './types/sourceTypes'

export const sourceTypeIconMap: Record<SourceIconType, SvgIconComponent> = {
  url: AddLinkOutlinedIcon,
  text: NotesOutlinedIcon,
  pdf: PictureAsPdfOutlinedIcon,
  epub: MenuBookOutlinedIcon,
  txt: DescriptionOutlinedIcon,
  markdown: ArticleOutlinedIcon,
  csv: TableChartOutlinedIcon,
  xlsx: TableChartOutlinedIcon,
  pptx: SlideshowOutlinedIcon,
  image: ImageOutlinedIcon,
  docx: DescriptionOutlinedIcon,
}

export const resolveSourceTypeIcon = (iconType: SourceIconType): SvgIconComponent =>
  sourceTypeIconMap[iconType] ?? DescriptionOutlinedIcon
