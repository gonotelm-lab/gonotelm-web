import { describe, expect, it } from 'vitest'
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  VERIFICATION_CODE_LENGTH,
  isValidEmail,
  isValidPassword,
  isValidVerificationCode,
  normalizeEmail,
  normalizeVerificationCode,
  passwordByteLength,
} from './authValidation'

describe('normalizeEmail', () => {
  it('trim + 全量小写', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
  })
})

describe('isValidEmail', () => {
  it.each(['a@b.com', '  A@B.COM ', 'x.y+z@sub.domain.cn'])('接受 %s', (raw) => {
    expect(isValidEmail(raw)).toBe(true)
  })

  it.each(['', 'ab', 'a@', '@b', 'a@@b', 'a b@c.com', 'a@b c.com', 'a@b\n.com'])(
    '拒绝 %s',
    (raw) => {
      expect(isValidEmail(raw)).toBe(false)
    },
  )

  it('长度上限与 entity.ValidateEmail 一致（255）', () => {
    expect(EMAIL_MAX_LENGTH).toBe(255)
    const local = 'a'.repeat(EMAIL_MAX_LENGTH - '@b.com'.length)
    expect(isValidEmail(`${local}@b.com`)).toBe(true)
    expect(isValidEmail(`${local}a@b.com`)).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('按字节数判定上下限', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('a'.repeat(PASSWORD_MAX_BYTES))).toBe(true)
    expect(isValidPassword('a'.repeat(PASSWORD_MAX_BYTES + 1))).toBe(false)
  })

  it('多字节字符按字节而不是字符计数', () => {
    // 24 个汉字 = 72 字节（bcrypt 上限内），25 个就超了。
    expect(passwordByteLength('你'.repeat(24))).toBe(72)
    expect(isValidPassword('你'.repeat(24))).toBe(true)
    expect(isValidPassword('你'.repeat(25))).toBe(false)
  })
})

describe('验证码', () => {
  it('只接受固定长度的纯数字', () => {
    expect(VERIFICATION_CODE_LENGTH).toBe(6)
    expect(isValidVerificationCode('123456')).toBe(true)
    expect(isValidVerificationCode(' 123456 ')).toBe(true)
    expect(isValidVerificationCode('12345')).toBe(false)
    expect(isValidVerificationCode('1234567')).toBe(false)
    expect(isValidVerificationCode('12345a')).toBe(false)
  })

  it('输入收敛：去掉非数字并截断', () => {
    expect(normalizeVerificationCode('12a34-567')).toBe('123456')
    expect(normalizeVerificationCode('  0099 ')).toBe('0099')
  })
})
