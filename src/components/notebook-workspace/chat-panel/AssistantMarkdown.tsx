import { Box } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MarkdownCode } from './MarkdownCode'

interface AssistantMarkdownProps {
  content: string
}

const markdownBaseTypography = {
  fontSize: 14.8,
  lineHeight: 1.72,
}

const markdownHeadingStyles = {
  h1: { fontSize: 20, mt: 1.6, mb: 1 },
  h2: { fontSize: 18, mt: 1.35, mb: 0.85 },
  h3: { fontSize: 16.5, mt: 1.15, mb: 0.7 },
  h4: { fontSize: 15.5, mt: 1, mb: 0.55 },
}

const markdownSpacingTokens = {
  paragraphGap: 0.95,
  listPaddingLeft: 2.8,
  listItemTop: 0.22,
  listItemGap: 0.42,
  blockquoteTop: 0.95,
  blockquotePaddingLeft: 1.4,
  blockquotePaddingY: 0.2,
  horizontalRuleY: 3,
  tableMarginTop: 1,
  tableMarginBottom: 0.5,
}

const markdownTableTokens = {
  fontSize: 13.6,
  cellPaddingX: 0.8,
  cellPaddingY: 0.55,
}

export function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  return (
    <Box
      sx={{
        ...markdownBaseTypography,
        color: 'text.primary',
        '& h1, & h2, & h3, & h4': {
          m: 0,
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: 0.1,
        },
        '& h1': markdownHeadingStyles.h1,
        '& h2': markdownHeadingStyles.h2,
        '& h3': markdownHeadingStyles.h3,
        '& h4': markdownHeadingStyles.h4,
        '& p': { m: 0 },
        '& p + p': { mt: markdownSpacingTokens.paragraphGap },
        '& ul, & ol': { m: 0, pl: markdownSpacingTokens.listPaddingLeft },
        '& li': { mt: markdownSpacingTokens.listItemTop },
        '& li + li': { mt: markdownSpacingTokens.listItemGap },
        '& blockquote': {
          m: 0,
          mt: markdownSpacingTokens.blockquoteTop,
          pl: markdownSpacingTokens.blockquotePaddingLeft,
          py: markdownSpacingTokens.blockquotePaddingY,
          borderLeft: '3px solid',
          borderColor: 'divider',
          color: 'text.secondary',
        },
        '& hr': {
          my: markdownSpacingTokens.horizontalRuleY,
          border: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          mt: markdownSpacingTokens.tableMarginTop,
          mb: markdownSpacingTokens.tableMarginBottom,
          fontSize: markdownTableTokens.fontSize,
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          px: markdownTableTokens.cellPaddingX,
          py: markdownTableTokens.cellPaddingY,
          textAlign: 'left',
          verticalAlign: 'top',
        },
        '& th': {
          bgcolor: 'action.hover',
          fontWeight: 700,
        },
        '& strong': {
          fontWeight: 700,
        },
        '& a': { color: 'primary.main', textDecoration: 'none' },
        '& a:hover': { textDecoration: 'underline' },
        '& .katex': {
          fontSize: '0.96em',
        },
        '& .katex-display': {
          m: 0,
          my: 0.7,
          overflowX: 'auto',
          overflowY: 'visible',
          textAlign: 'left',
        },
        '& .katex-display > .katex': {
          textAlign: 'left',
        },
        '& .katex-display + .katex-display': {
          mt: 0.28,
        },
        '& p + .katex-display, & .katex-display + p': {
          mt: 0.72,
        },
        '& .math.math-display': {
          my: 0.7,
        },
        '& .math.math-display + .math.math-display': {
          mt: 0.28,
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: MarkdownCode,
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}
