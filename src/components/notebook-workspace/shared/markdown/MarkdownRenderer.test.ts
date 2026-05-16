import { describe, expect, it } from 'vitest'
import { normalizeMarkdownDelimiters } from './markdownNormalization'

describe('normalizeMarkdownDelimiters', () => {
  it('normalizes full-width asterisks for markdown bold text', () => {
    const result = normalizeMarkdownDelimiters('＊＊用户信息编辑卡片＊＊')

    expect(result).toBe('**用户信息编辑卡片**')
  })

  it('does not normalize full-width asterisks inside inline code', () => {
    const result = normalizeMarkdownDelimiters('普通文本 ＊＊加粗＊＊ 和 `＊＊代码＊＊`')

    expect(result).toBe('普通文本 **加粗** 和 `＊＊代码＊＊`')
  })

  it('does not normalize full-width asterisks inside fenced code block', () => {
    const content = ['段落 ＊＊标题＊＊', '```ts', 'const label = "＊＊代码＊＊"', '```'].join('\n')

    const result = normalizeMarkdownDelimiters(content)

    expect(result).toBe(['段落 **标题**', '```ts', 'const label = "＊＊代码＊＊"', '```'].join('\n'))
  })
})
