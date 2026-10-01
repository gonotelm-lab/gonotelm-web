import { describe, expect, it } from 'vitest'
import { buildAuthLoginPath, getAuthProviders, logout } from './auth'

describe('buildAuthLoginPath', () => {
  it('login_provider / login_from 走 query', () => {
    expect(buildAuthLoginPath({ provider: 'github', from: 'web' })).toBe(
      '/api/v1/auth/login?login_provider=github&login_from=web',
    )
  })

  it('return_to 存在时追加并做 URL 编码', () => {
    expect(
      buildAuthLoginPath({ provider: 'github', from: 'web', returnTo: '/notebook/a b' }),
    ).toBe(
      '/api/v1/auth/login?login_provider=github&login_from=web&return_to=%2Fnotebook%2Fa+b',
    )
  })

  it('return_to 为空时不出现在 query 里', () => {
    expect(buildAuthLoginPath({ provider: 'github', from: 'web', returnTo: '' })).toBe(
      '/api/v1/auth/login?login_provider=github&login_from=web',
    )
  })
})

describe('auth api', () => {
  it('getAuthProviders 解析 providers', async () => {
    await expect(getAuthProviders()).resolves.toEqual({
      providers: [{ name: 'github' }],
    })
  })

  it('logout 返回 null', async () => {
    await expect(logout()).resolves.toBeNull()
  })
})
