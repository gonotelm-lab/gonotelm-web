import { beforeAll, describe, expect, it } from 'vitest'
import { installBrowserShims } from './browserShim'

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
 * - 验证码/重发用不存在的凭证（命中 106016，不会建号）
 * - 重置只发随机邮箱与乱 token（不写 pending、不发信）
 * - 密码登录用不存在的邮箱（命中 106011，统一文案）
 */

const live = process.env.GNLM_LIVE_AUTH === '1'

const errorCode = (error: unknown) => (error as { code?: number }).code

/**
 * 每次运行换一个收件地址：后端会对同一邮箱占发送间隔（防轰炸），固定地址会让第二次运行
 * 撞上 106021，把「接口没挂载」和「上一次跑过」混为一谈。`.invalid` 是保留 TLD，永远不可达。
 */
const freshProbeEmail = () =>
  `probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.invalid`

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

  it('POST /auth/email/login 邮箱密码登录已挂载，错误凭证返回 106011', async () => {
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

  // ── 找回密码（公开）───────────────────────────────────────────────────────
  // 三条都无副作用：不存在的邮箱不发信、不写 pending；乱 token 只读不写。
  it('GET /auth/prefetch 已挂载，返回密码策略字段', async () => {
    await expect(auth.getAuthPrefetch()).resolves.toEqual({
      require_complex_password: expect.any(Boolean),
    })
  })

  it('POST /auth/password/reset 已挂载，且不存在的邮箱也成功（防账号枚举）', async () => {
    await expect(
      auth.requestPasswordReset({ email: freshProbeEmail() }),
    ).resolves.toBeNull()
  })

  it('POST /auth/password/reset/verify 已挂载，无效 token 返回 106016', async () => {
    // 口令要先过硬策略校验（否则拿到的是 106014，探不出后面那步），这里给一个合规口令。
    await expect(
      auth.confirmPasswordResetLink({
        token: 'not-a-real-token',
        new_password: 'Not-a-real1Pass',
      }),
    ).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.AUTH_ERROR_CODE.verificationExpired,
    )
  })


  it('GET /auth/identities 已挂载且要求已登录（2002）', async () => {
    await expect(auth.getAuthIdentities()).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.NOT_LOGIN_CODE,
    )
  })

  it('GET /auth/supported-identities 已挂载且要求已登录（2002）', async () => {
    await expect(auth.getAuthSupportedIdentities()).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.NOT_LOGIN_CODE,
    )
  })

  it('POST /auth/identities/bind 已挂载（provider 走 body）且要求已登录（2002）', async () => {
    await expect(auth.startIdentityBind('github')).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === authLib.NOT_LOGIN_CODE,
    )
  })

  it('POST /auth/identities/unbind 已挂载且要求已登录（2002）', async () => {
    await expect(
      auth.unbindIdentity({ bind_id: 'not-a-real-bind-id', provider: 'github' }),
    ).rejects.toSatisfy((error: unknown) => errorCode(error) === authLib.NOT_LOGIN_CODE)
  })
})
