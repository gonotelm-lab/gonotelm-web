const markdownCodeSegmentPattern = /(```[\s\S]*?```|`[^`\n]*`)/g
const fullWidthAsteriskPattern = /＊/g

export function normalizeMarkdownDelimiters(content: string): string {
  if (!content) {
    return content
  }

  const segments = content.split(markdownCodeSegmentPattern)
  return segments
    .map((segment, idx) => {
      if (idx % 2 === 1) {
        return segment
      }
      return segment.replace(fullWidthAsteriskPattern, '*')
    })
    .join('')
}
