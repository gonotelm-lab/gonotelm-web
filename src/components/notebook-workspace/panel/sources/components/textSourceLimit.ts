export const textSourceMaxChars = 50_000

export function countTextSourceChars(value: string): number {
  return Array.from(value).length
}

export function clampTextSourceInput(
  value: string,
  maxChars = textSourceMaxChars,
): string {
  const chars = Array.from(value)
  if (chars.length <= maxChars) {
    return value
  }
  return chars.slice(0, maxChars).join('')
}
