import { describe, expect, it } from 'vitest'
import { getMe } from './user'

describe('getMe', () => {
  it('解析 user_id 与 nickname', async () => {
    await expect(getMe()).resolves.toEqual({ user_id: 'user-1', nickname: '测试用户' })
  })
})
