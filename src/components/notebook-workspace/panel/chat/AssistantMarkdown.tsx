import type { MouseEvent } from 'react'
import {
  MarkdownRenderer,
  type CitationClickTarget,
} from '../../shared/markdown/MarkdownRenderer'

interface AssistantMarkdownProps {
  content: string
  onCitationClick?: (
    event: MouseEvent<HTMLAnchorElement | HTMLElement>,
    target: CitationClickTarget,
  ) => void
}

export function AssistantMarkdown({ content, onCitationClick }: AssistantMarkdownProps) {
  return (
    <MarkdownRenderer
      content={content}
      renderCitationAsSuperscript
      justifyParagraphs
      onCitationClick={onCitationClick}
    />
  )
}
