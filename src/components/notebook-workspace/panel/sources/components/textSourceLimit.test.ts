import { describe, expect, it } from 'vitest'
import {
  clampTextSourceInput,
  countTextSourceChars,
  textSourceMaxChars,
} from './textSourceLimit'

describe('textSourceLimit', () => {
  it('countTextSourceChars 按字符计数（支持 emoji）', () => {
    expect(countTextSourceChars('abc')).toBe(3)
    expect(countTextSourceChars('你好')).toBe(2)
    expect(countTextSourceChars('A😀B')).toBe(3)
  })

  it('clampTextSourceInput 不超过上限时保持原值', () => {
    const input = 'Rust source text'
    expect(clampTextSourceInput(input)).toBe(input)
  })

  it('clampTextSourceInput 超过上限时截断到 50000 字符', () => {
    const input = 'a'.repeat(textSourceMaxChars + 5)
    const output = clampTextSourceInput(input)
    expect(output).toHaveLength(textSourceMaxChars)
  })
})
