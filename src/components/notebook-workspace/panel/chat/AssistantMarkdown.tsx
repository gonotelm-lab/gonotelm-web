import type { MouseEvent } from 'react'
import { MarkdownRenderer } from '../../shared/markdown/MarkdownRenderer'

interface AssistantMarkdownProps {
  content: string
  onCitationClick?: (event: MouseEvent<HTMLAnchorElement | HTMLElement>, citationIndex: string) => void
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
