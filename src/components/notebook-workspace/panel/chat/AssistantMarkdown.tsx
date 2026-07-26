import type { MouseEvent } from 'react'
import { MarkdownRenderer } from '../../shared/markdown/MarkdownRenderer'
import { workspaceType } from '../../shared/ui/typeTokens'

interface AssistantMarkdownProps {
  content: string
  onCitationClick?: (event: MouseEvent<HTMLAnchorElement | HTMLElement>, citationIndex: string) => void
}

export function AssistantMarkdown({ content, onCitationClick }: AssistantMarkdownProps) {
  return (
    <MarkdownRenderer
      content={content}
      fontSize={workspaceType.sm}
      renderCitationAsSuperscript
      justifyParagraphs
      onCitationClick={onCitationClick}
    />
  )
}
