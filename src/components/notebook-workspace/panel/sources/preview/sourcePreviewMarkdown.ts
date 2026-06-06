export interface SourceHighlightRange {
  start: number
  end: number
}

const toCodeUnitOffsetByRune = (text: string, runeOffset: number) => {
  if (runeOffset <= 0) {
    return 0
  }
  let codeUnitOffset = 0
  let consumedRunes = 0
  for (const rune of text) {
    if (consumedRunes >= runeOffset) {
      break
    }
    codeUnitOffset += rune.length
    consumedRunes += 1
  }
  return codeUnitOffset
}

const normalizeHighlightRange = (
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
): SourceHighlightRange | null => {
  if (!text) {
    return null
  }
  const safeStart = Math.max(Math.min(startCodeUnitOffset, text.length - 1), 0)
  const safeEnd = Math.max(Math.min(endCodeUnitOffset, text.length), safeStart + 1)
  if (safeEnd <= safeStart) {
    return null
  }
  return { start: safeStart, end: safeEnd }
}

export const expandHighlightRangeToLineBoundaries = (
  text: string,
  range: SourceHighlightRange | null,
): SourceHighlightRange | null => {
  if (!range) {
    return null
  }
  const lineStart = text.lastIndexOf('\n', Math.max(range.start - 1, 0))
  const lineEnd = text.indexOf('\n', range.end)
  return {
    start: lineStart < 0 ? 0 : lineStart + 1,
    end: lineEnd < 0 ? text.length : lineEnd,
  }
}

export const resolveHighlightRangeBySnippet = (
  text: string,
  snippet?: string,
): SourceHighlightRange | null => {
  if (!snippet) {
    return null
  }
  const normalizedSnippet = snippet.trim()
  if (!normalizedSnippet) {
    return null
  }
  const snippetStart = text.indexOf(normalizedSnippet)
  if (snippetStart < 0) {
    return null
  }
  return normalizeHighlightRange(text, snippetStart, snippetStart + normalizedSnippet.length)
}

export const resolveHighlightRangeByRunePosition = (
  text: string,
  position?: { start?: number; end?: number },
): SourceHighlightRange | null => {
  if (!position) {
    return null
  }
  const totalRunes = Array.from(text).length
  if (totalRunes <= 0) {
    return null
  }
  const safeStart = Math.min(Math.max(position.start ?? 0, 0), totalRunes - 1)
  const rawEnd = Math.min(Math.max(position.end ?? safeStart + 1, safeStart + 1), totalRunes)
  const startCodeUnitOffset = toCodeUnitOffsetByRune(text, safeStart)
  const endCodeUnitOffset = toCodeUnitOffsetByRune(text, rawEnd)
  return normalizeHighlightRange(text, startCodeUnitOffset, endCodeUnitOffset)
}

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const toLineMarkedHighlightMarkdown = (text: string) =>
  text
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return line
      }
      return `<mark>${escapeHtml(line)}</mark>`
    })
    .join('\n')

export const buildMarkdownWithLineMarksByRange = (
  content: string,
  range: SourceHighlightRange | null,
) => {
  if (!range) {
    return content
  }
  const focusText = content.slice(range.start, range.end)
  if (!focusText) {
    return content
  }
  return `${content.slice(0, range.start)}${toLineMarkedHighlightMarkdown(focusText)}${content.slice(range.end)}`
}
