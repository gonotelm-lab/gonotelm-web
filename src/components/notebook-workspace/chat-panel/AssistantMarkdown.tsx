import { MarkdownRenderer } from '../MarkdownRenderer'

interface AssistantMarkdownProps {
  content: string
}

export function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  return <MarkdownRenderer content={content} />
}
