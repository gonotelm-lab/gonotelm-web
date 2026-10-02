import { describe, expect, it } from 'vitest'
import { getMe } from './user'

describe('getMe', () => {
  it('解析 user_id、nickname 与 avatar_url', async () => {
    await expect(getMe()).resolves.toEqual({
      user_id: 'user-1',
      nickname: '测试用户',
      avatar_url: 'https://cdn.example.com/avatars/user-1.png',
    })
  })
})
