import { useMemo, type MouseEvent, type ReactNode } from 'react'
import { Box } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MarkdownCode } from '@/components/notebook-workspace/panel/chat/MarkdownCode'
import { workspaceRadius, workspaceSpace } from '../ui/layoutTokens'
import { workspaceTransitionPresets } from '../ui/motionTokens'
import { subtleScrollbarSx } from '../ui/scrollbar'
import { workspaceType } from '../ui/typeTokens'
import { normalizeMarkdownDelimiters } from './markdownNormalization'

interface MarkdownRendererProps {
  content: string
  citations?: string[]
  /** Body text size; defaults to sm (14). */
  fontSize?: number
  renderCitationAsSuperscript?: boolean
  justifyParagraphs?: boolean
  onCitationClick?: (
    event: MouseEvent<HTMLAnchorElement | HTMLElement>,
    target: CitationClickTarget,
  ) => void
}

export interface CitationClickTarget {
  citationIndex?: string
  docId?: string
}

const markdownBaseTypography = {
  fontSize: workspaceType.sm,
  lineHeight: 1.65,
}

/** Reading rhythm on the locked type scale (content, not panel chrome). */
const markdownHeadingStyles = {
  h1: { fontSize: workspaceType.xl, mt: workspaceSpace.lg, mb: workspaceSpace.sm },
  h2: { fontSize: workspaceType.lg, mt: workspaceSpace.md, mb: workspaceSpace.sm },
  h3: { fontSize: workspaceType.sm, mt: workspaceSpace.md, mb: workspaceSpace.xxs },
  h4: { fontSize: workspaceType.xs, mt: workspaceSpace.sm, mb: workspaceSpace.xxs },
}

const markdownSpacingTokens = {
  paragraphGap: workspaceSpace.sm,
  listPaddingLeft: workspaceSpace.xl,
  listItemTop: 0,
  listItemGap: workspaceSpace.xxs,
  blockquoteTop: workspaceSpace.sm,
  blockquotePaddingLeft: workspaceSpace.md,
  blockquotePaddingY: workspaceSpace.xxs,
  horizontalRuleY: workspaceSpace.xl,
  tableMarginTop: workspaceSpace.sm,
  tableMarginBottom: workspaceSpace.xxs,
}

const markdownTableTokens = {
  fontSize: workspaceType.sm,
  cellPaddingX: workspaceSpace.sm,
  cellPaddingY: workspaceSpace.xxs,
}

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'sup', 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ['href', /^#cite-(?:doc-[0-9a-fA-F-]+|\d+)$/],
    ],
    sup: [...(defaultSchema.attributes?.sup ?? [])],
    mark: [...(defaultSchema.attributes?.mark ?? [])],
  },
}

const citationPattern = /<sup>\s*(\d+)\s*<\/sup>/gi
const bracketCitationPattern = /\[\[\s*(\d+)\s*\]\]/g
const markdownCodeSegmentPattern = /(```[\s\S]*?```|`[^`\n]*`)/g

const toCitationMarkdownLink = (citationIndex: string, citations?: string[]) => {
  const docId = citations?.[Number(citationIndex) - 1]?.trim()
  const citationHref = docId ? `#cite-doc-${docId}` : `#cite-${citationIndex}`
  return `[\\[${citationIndex}\\]](${citationHref})`
}

function transformCitationMarkers(content: string): string {
  if (!content) {
    return content
  }

  const segments = content.split(markdownCodeSegmentPattern)
  return segments
    .map((segment, idx) => {
      if (idx % 2 === 1) {
        return segment
      }
      return segment
        .replace(citationPattern, (_matched, citationIndex: string) =>
          toCitationMarkdownLink(citationIndex),
        )
        .replace(bracketCitationPattern, (_matched, citationIndex: string) =>
          toCitationMarkdownLink(citationIndex),
        )
    })
    .join('')
}

function parseCitationHref(href: string | undefined): { citationIndex: string } | null {
  if (!href || !href.startsWith('#cite-')) {
    return null
  }

  const citationIndex = href.slice('#cite-'.length)
  if (!citationIndex || !/^\d+$/.test(citationIndex)) {
    return null
  }

  return { citationIndex }
}

const readCitationIndexFromChildren = (children: ReactNode) => {
  const text = Array.isArray(children)
    ? children.map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : '')).join('')
    : String(children ?? '')
  return text.trim()
}

export function MarkdownRenderer({
  content,
  fontSize = workspaceType.sm,
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
        ? transformCitationMarkers(normalizedContent)
        : normalizedContent),
    [normalizedContent, renderCitationAsSuperscript],
  )

  return (
    <Box
      sx={(theme) => ({
        ...markdownBaseTypography,
        fontSize,
        color: 'text.primary',
        fontVariantLigatures: 'none',
        fontFeatureSettings: '"liga" 0, "calt" 0',
        ...subtleScrollbarSx(theme, { within: '& .katex-display > .katex' }),
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
          display: 'inline-block',
          ml: 0,
          px: 0,
          py: 0,
          border: 0,
          bgcolor: 'transparent',
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.72em',
          lineHeight: 1,
          verticalAlign: 'super',
          letterSpacing: '0.01em',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: workspaceTransitionPresets.colorOnly,
        },
        '& a[href^="#cite-"]:hover': {
          color: 'text.primary',
          textDecoration: 'underline',
        },
        '& mark': {
          px: workspaceSpace.xxs,
          py: 0,
          bgcolor: 'action.selected',
          color: 'inherit',
          borderRadius: workspaceRadius.sm,
        },
        '& .katex': {
          fontSize: '0.96em',
        },
        '& .katex-display': {
          m: 0,
          my: workspaceSpace.sm,
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
          mt: workspaceSpace.xxs,
        },
        '& p + .katex-display, & .katex-display + p': {
          mt: workspaceSpace.sm,
        },
        '& .math.math-display': {
          my: workspaceSpace.sm,
        },
        '& .math.math-display + .math.math-display': {
          mt: workspaceSpace.xxs,
        },
      })}
    >
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex]}
        components={{
          sup: ({ children }) => {
            const citationIndex = readCitationIndexFromChildren(children)
            if (!/^\d+$/.test(citationIndex) || !onCitationClick) {
              return <sup>{children}</sup>
            }

            return (
              <sup>
                <a
                  href={`#cite-${citationIndex}`}
                  aria-label={`打开引用 ${citationIndex}`}
                  onClick={(event) => {
                    event.preventDefault()
                    onCitationClick(event, { citationIndex })
                  }}
                >
                  {citationIndex}
                </a>
              </sup>
            )
          },
          a: ({ href, children, ...props }) => {
            const citationHref = parseCitationHref(href)
            if (citationHref && onCitationClick) {
              const fallbackLabel = href ? `打开引用定位 ${href}` : '打开引用'
              return (
                <a
                  {...props}
                  href={href}
                  aria-label={props['aria-label'] ?? fallbackLabel}
                  onClick={(event) => {
                    event.preventDefault()
                    onCitationClick(event, { citationIndex: citationHref.citationIndex })
                  }}
                >
                  {children ?? href ?? '引用'}
                </a>
              )
            }

            const shouldOpenInNewTab = Boolean(href && !href.startsWith('#'))
            const fallbackLabel = href ? `打开链接 ${href}` : '打开链接'
            return (
              <a
                {...props}
                href={href}
                aria-label={props['aria-label'] ?? fallbackLabel}
                target={shouldOpenInNewTab ? '_blank' : undefined}
                rel={shouldOpenInNewTab ? 'noopener noreferrer' : undefined}
              >
                {children ?? href ?? '链接'}
              </a>
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
