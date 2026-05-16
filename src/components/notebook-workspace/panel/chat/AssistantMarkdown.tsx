import type { MouseEvent } from 'react'
import { MarkdownRenderer } from '../../shared/markdown'

interface AssistantMarkdownProps {
  content: string
  onCitationClick?: (
    event: MouseEvent<HTMLAnchorElement>,
    sourceIndex: string,
    docIndex: string,
  ) => void
}

export function AssistantMarkdown({ content, onCitationClick }: AssistantMarkdownProps) {
  return (
    <MarkdownRenderer
      content={content}
      renderCitationAsSuperscript
      onCitationClick={onCitationClick}
    />
  )
}
