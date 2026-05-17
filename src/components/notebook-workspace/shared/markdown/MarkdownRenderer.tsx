import { useMemo } from 'react'
import type { MouseEvent } from 'react'
import { Box } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MarkdownCode } from '@/components/notebook-workspace/panel/chat/MarkdownCode'
import { normalizeMarkdownDelimiters } from './markdownNormalization'

interface MarkdownRendererProps {
  content: string
  renderCitationAsSuperscript?: boolean
  justifyParagraphs?: boolean
  onCitationClick?: (
    event: MouseEvent<HTMLAnchorElement>,
    sourceIndex: string,
    docIndex: string,
  ) => void
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

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'sup'],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ['href', /^#cite-[a-zA-Z0-9_%-]+~[a-zA-Z0-9_%-]+$/],
    ],
    sup: [...(defaultSchema.attributes?.sup ?? [])],
  },
}

const citationPattern = /<sup>\s*([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\s*<\/sup>/gi
const markdownCodeSegmentPattern = /(```[\s\S]*?```|`[^`\n]*`)/g

function transformCitationSuperscript(content: string): string {
  if (!content) {
    return content
  }

  const segments = content.split(markdownCodeSegmentPattern)
  return segments
    .map((segment, idx) => {
      if (idx % 2 === 1) {
        return segment
      }
      return segment.replace(citationPattern, (_matched, sourceIndex: string, docIndex: string) => {
        const citationHref = `#cite-${encodeURIComponent(sourceIndex)}~${encodeURIComponent(docIndex)}`
        return `[\\[${sourceIndex}\\]](${citationHref})`
      })
    })
    .join('')
}

function parseCitationHref(href: string | undefined): { sourceIndex: string; docIndex: string } | null {
  if (!href || !href.startsWith('#cite-')) {
    return null
  }

  const payload = href.slice('#cite-'.length)
  const splitIdx = payload.indexOf('~')
  if (splitIdx <= 0 || splitIdx >= payload.length - 1) {
    return null
  }

  const sourceIndex = decodeURIComponent(payload.slice(0, splitIdx))
  const docIndex = decodeURIComponent(payload.slice(splitIdx + 1))
  if (!sourceIndex || !docIndex) {
    return null
  }

  return { sourceIndex, docIndex }
}

export function MarkdownRenderer({
  content,
  renderCitationAsSuperscript = false,
  justifyParagraphs = false,
  onCitationClick,
}: MarkdownRendererProps) {
  const normalizedContent = useMemo(
    () => normalizeMarkdownDelimiters(content),
    [content],
  )
  const renderedContent = useMemo(
    () =>
      (renderCitationAsSuperscript
        ? transformCitationSuperscript(normalizedContent)
        : normalizedContent),
    [normalizedContent, renderCitationAsSuperscript],
  )

  return (
    <Box
      sx={{
        ...markdownBaseTypography,
        color: 'text.primary',
        fontVariantLigatures: 'none',
        fontFeatureSettings: '"liga" 0, "calt" 0',
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
        '& p': {
          m: 0,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          ...(justifyParagraphs
            ? {
                textAlign: 'justify',
                textJustify: 'inter-character',
                textAlignLast: 'left',
              }
            : null),
        },
        '& p + p': { mt: markdownSpacingTokens.paragraphGap },
        '& ul, & ol': { m: 0, pl: markdownSpacingTokens.listPaddingLeft },
        '& li': {
          mt: markdownSpacingTokens.listItemTop,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        },
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
          fontWeight: 800,
        },
        '& a': { color: 'primary.main', textDecoration: 'none' },
        '& a:hover': { textDecoration: 'underline' },
        '& a[href^="#cite-"]': {
          ml: 0.2,
          color: 'primary.main',
          fontWeight: 600,
          fontSize: '0.74em',
          lineHeight: 1,
          verticalAlign: 'super',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'color 0.15s ease',
        },
        '& a[href^="#cite-"]:hover': {
          color: 'primary.dark',
          textDecoration: 'underline',
        },
        '& .katex': {
          fontSize: '0.96em',
        },
        '& .katex-display': {
          m: 0,
          my: 0.7,
          overflow: 'hidden',
          textAlign: 'left',
        },
        '& .katex-display > .katex': {
          display: 'block',
          textAlign: 'left',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
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
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex]}
        components={{
          a: ({ href, ...props }) => {
            const citationHref = parseCitationHref(href)
            if (citationHref) {
              return (
                <a
                  {...props}
                  href={href}
                  onClick={(event) => {
                    if (!onCitationClick) {
                      return
                    }
                    event.preventDefault()
                    onCitationClick(event, citationHref.sourceIndex, citationHref.docIndex)
                  }}
                />
              )
            }

            const shouldOpenInNewTab = Boolean(href && !href.startsWith('#'))
            return (
              <a
                {...props}
                href={href}
                target={shouldOpenInNewTab ? '_blank' : undefined}
                rel={shouldOpenInNewTab ? 'noopener noreferrer' : undefined}
              />
            )
          },
          code: MarkdownCode,
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </Box>
  )
}
