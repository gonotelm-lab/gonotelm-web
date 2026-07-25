import { Box } from '@mui/material'
import { MarkdownRenderer } from '../../../shared/markdown/MarkdownRenderer'
import { buildMarkdownWithLineMarksByRange, type SourceHighlightRange } from './sourcePreviewMarkdown'
import type { SourcePreviewViewType } from './types'

interface RenderSourcePreviewContentParams {
  viewType: SourcePreviewViewType
  markdown: string
  focusRange: SourceHighlightRange | null
}

export const renderSourcePreviewContent = ({
  markdown,
  focusRange,
}: RenderSourcePreviewContentParams) => {
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
