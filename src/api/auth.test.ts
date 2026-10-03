import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAuthLoginPath, buildAuthLoginUrl, getAuthProviders, logout } from './auth'

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

describe('buildAuthLoginUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('return_to 带上前端 origin', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(
      buildAuthLoginUrl({ provider: 'github', from: 'web', returnTo: '/notebook/n-1' }),
    ).toBe(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fn-1',
    )
  })

  it('未传 return_to 时落到前端根路径而不是裸 /', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildAuthLoginUrl({ provider: 'github', from: 'web' })).toBe(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=http%3A%2F%2F127.0.0.1%3A5173%2F',
    )
  })
})

describe('auth api', () => {
  it('getAuthProviders 解析 providers', async () => {
    await expect(getAuthProviders()).resolves.toEqual({
      providers: [{ name: 'github' }, { name: 'google' }],
    })
  })

  it('logout 返回 null', async () => {
    await expect(logout()).resolves.toBeNull()
  })
})
