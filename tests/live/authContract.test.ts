import { beforeAll, describe, expect, it } from 'vitest'

/**
 * 真机契约测试：直接用前端的 API 层打本机后端，验证 users_v2 登录改造的接口是否已经就位。
 *
 * 默认跳过（CI 没有后端），显式开启：
 *
 *   GNLM_LIVE_AUTH=1 npx vitest run --config vitest.live.config.ts
 *
 * 断言的是**改造后的目标契约**：后端接口层还没落地时这里会红，落地后转绿——
 * 它同时也是「后端改到什么程度」的可执行探针。
 *
 * 探针只发无效凭证，不建 pending、不建账号、不签发会话：
 * - 注册用非法邮箱（命中 106013 参数校验，不会写 pending）
 * - 验证/重发用不存在的凭证（命中 106016，不会建号）
 * - 口令登录用不存在的邮箱（命中 106011，统一文案）
 */

const live = process.env.GNLM_LIVE_AUTH === '1'

/** node fetch 没有 cookie 容器；这里给前端 http 层补一个最小可用的浏览器 cookie 环境。 */
const jar = new Map<string, string>()

const cookieHeader = () =>
  [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

const applySetCookie = (raw: string) => {
  const pair = raw.split(';')[0] ?? ''
  const separator = pair.indexOf('=')
  if (separator < 0) {
    return
  }
  const name = pair.slice(0, separator).trim()
  const value = pair.slice(separator + 1).trim()
  if (value === '') {
    jar.delete(name)
    return
  }
  jar.set(name, value)
}

function installBrowserShims() {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      get cookie() {
        return cookieHeader()
      },
      set cookie(raw: string) {
        applySetCookie(raw)
      },
    },
  })

  const realFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    const cookies = cookieHeader()
    if (cookies) {
      headers.set('Cookie', cookies)
    }
    const response = await realFetch(input, { ...init, headers })
    for (const raw of response.headers.getSetCookie()) {
      applySetCookie(raw)
    }
    return response
  }
}

const errorCode = (error: unknown) => (error as { code?: number }).code

describe.skipIf(!live)('live backend · users_v2 登录契约', () => {
  let auth: typeof import('@/api/auth')
  let user: typeof import('@/api/user')
  let authLib: typeof import('@/lib/auth')

  beforeAll(async () => {
    installBrowserShims()
    // 必须在 shim 之后再加载：http/csrf 在模块顶层读 import.meta.env 与 document。
    auth = await import('@/api/auth')
    user = await import('@/api/user')
    authLib = await import('@/lib/auth')
  })

  it('harness 自检：非安全方法能通过 CSRF 双提交（POST /auth/logout 返回 204）', async () => {
    // 这条用来证明 cookie jar 与 X-CSRF-Token 是真的生效了：
    // 若 harness 坏了，后面的 404 就分不清是「后端没实现」还是「探针没打通」。
    await expect(auth.logout()).resolves.toBeNull()
  })

  it('GET /auth/providers 已带 password_enabled', async () => {
    const data = await auth.getAuthProviders()
    expect(Array.isArray(data.providers)).toBe(true)
    expect(data.password_enabled).toBe(true)
  })

  it('GET /user/me 未登录时是 2002，且已带 has_password 字段位', async () => {
    await expect(user.getMe()).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.NOT_LOGIN_CODE,
    )
  })

  it('POST /auth/email/login 邮箱口令登录已挂载，错误凭证返回 106011', async () => {
    await expect(
      auth.passwordLogin({ email: 'nobody@example.invalid', password: 'not-a-real-password' }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        errorCode(error) === authLib.AUTH_ERROR_CODE.invalidCredentials,
    )
  })

  it('POST /auth/email/register 已挂载，非法邮箱返回 106013', async () => {
    await expect(
      auth.registerEmail({ email: 'not-an-email', password: 'not-a-real-password' }),
    ).rejects.toSatisfy((error: unknown) => errorCode(error) === authLib.AUTH_ERROR_CODE.emailInvalid)
  })

  it('POST /auth/email/verify 已挂载，无效 token 返回 106016', async () => {
    await expect(auth.verifyEmailToken({ token: 'not-a-real-token' })).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.AUTH_ERROR_CODE.verificationExpired,
    )
  })

  it('POST /auth/email/verify/code 已挂载，无 pending 返回 106016', async () => {
    await expect(
      auth.verifyEmailCode({ email: 'nobody@example.invalid', code: '000000' }),
    ).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.AUTH_ERROR_CODE.verificationExpired,
    )
  })

  it('POST /auth/email/resend 已挂载，无 pending 返回 106016', async () => {
    await expect(
      auth.resendVerificationEmail({ email: 'nobody@example.invalid' }),
    ).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.AUTH_ERROR_CODE.verificationExpired,
    )
  })

  it('PUT /auth/password 已挂载且要求已登录（2002）', async () => {
    await expect(auth.setPassword({ new_password: 'not-a-real-password' })).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.NOT_LOGIN_CODE,
    )
  })
})
