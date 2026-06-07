import { Box } from '@mui/material'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { MarkdownRenderer } from '../../../shared/markdown/MarkdownRenderer'
import { SourceParsedTreeView } from '../components/SourceParsedTreeView'
import { buildMarkdownWithLineMarksByRange, type SourceHighlightRange } from './sourcePreviewMarkdown'
import type { SourcePreviewViewType } from './types'

interface RenderSourcePreviewContentParams {
  viewType: SourcePreviewViewType
  markdown: string
  focusRange: SourceHighlightRange | null
  tree: GetSourceParsedTreeResponse | null
}

export const renderSourcePreviewContent = ({
  viewType,
  markdown,
  focusRange,
  tree,
}: RenderSourcePreviewContentParams) => {
  if (viewType === 'tree') {
    return <SourceParsedTreeView tree={tree} />
  }

  if (focusRange) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <MarkdownRenderer
          content={buildMarkdownWithLineMarksByRange(markdown, focusRange)}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <MarkdownRenderer content={markdown} />
    </Box>
  )
}
