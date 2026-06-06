import { Box, Typography } from '@mui/material'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { MarkdownRenderer } from '../../../shared/markdown/MarkdownRenderer'
import { SourceParsedTreeView } from '../components/SourceParsedTreeView'
import { buildMarkdownWithLineMarksByRange, type SourceHighlightRange } from './sourcePreviewMarkdown'
import type { SourcePreviewViewType } from './types'

interface RenderSourcePreviewContentParams {
  viewType: SourcePreviewViewType
  markdown: string
  highlightSnippet: string
  focusRange: SourceHighlightRange | null
  tree: GetSourceParsedTreeResponse | null
}

export const renderSourcePreviewContent = ({
  viewType,
  markdown,
  highlightSnippet,
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

  if (highlightSnippet) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Box
          data-citation-range-highlight="true"
          sx={{
            px: 0.7,
            py: 0.55,
            borderRadius: 0.7,
            bgcolor: '#FFF59D',
            mb: 0.55,
          }}
        >
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 500 }}
          >
            {highlightSnippet}
          </Typography>
        </Box>
        <MarkdownRenderer content={markdown} />
      </Box>
    )
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <MarkdownRenderer content={markdown} />
    </Box>
  )
}
