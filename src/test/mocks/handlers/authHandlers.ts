import { http } from 'msw'
import { createNoContentResponse, createSuccessResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

/** 头像上传成功后返回的直链；带时间戳以便断言旧地址被替换。 */
export const MOCK_UPLOADED_AVATAR_URL = 'https://cdn.example.com/avatars/user-1-uploaded.png'

/**
 * 邮箱验证成功是「无响应体」语义（后端用 204），
 * 密码登录成功只体现在 Set-Cookie 上，因此同样按 204 处理。
 */
export const authHandlers = [
  // 默认保持与「users_v2 改造前」的后端一致：providers 里没有 password_enabled，
  // 因此默认不渲染密码表单。需要密码表单的用例自己覆盖该 handler。
  http.get(`${apiBaseUrl}/api/v1/auth/providers`, () =>
    createSuccessResponse({ providers: [{ name: 'github' }, { name: 'google' }] }),
  ),
  http.get(`${apiBaseUrl}/api/v1/user/me`, () =>
    createSuccessResponse({
      user_id: 'user-1',
      nickname: '测试用户',
      email: 'user@example.com',
      avatar_url: 'https://cdn.example.com/avatars/user-1.png',
    }),
  ),
  // 后端 PATCH /user/me 成功返回 204 空响应。
  http.patch(`${apiBaseUrl}/api/v1/user/me`, () => createNoContentResponse()),
  // 后端 POST /user/me/avatar 成功返回 200 + { avatar_url }。
  http.post(`${apiBaseUrl}/api/v1/user/me/avatar`, () =>
    createSuccessResponse({ avatar_url: MOCK_UPLOADED_AVATAR_URL }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/logout`, () => createNoContentResponse()),

  // ── users_v2 登录改造新增（P0）─────────────────────────────────────────────
  // 登录/验证成功：200 + { user_id }（后端 finishSession → AuthSessionResponse）。
  // 密码登录在 `email/*` 分组下（不是 POST /auth/login）。
  http.post(`${apiBaseUrl}/api/v1/auth/email/login`, () =>
    createSuccessResponse({ user_id: 'user-1' }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/email/verify`, () =>
    createSuccessResponse({ user_id: 'user-1' }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/email/verify/code`, () =>
    createSuccessResponse({ user_id: 'user-1' }),
  ),
  // 注册：200 + { email_verified }——默认走需要验证的模式（账号要等验证通过才建）；
  // 免验证模式的用例自己覆盖成 { email_verified: true }。重发仍是 204。
  http.post(`${apiBaseUrl}/api/v1/auth/email/register`, () =>
    createSuccessResponse({ email_verified: false }),
  ),
  // 注册前元数据：默认不要求复杂密码；需要复杂密码的用例自己覆盖成 true。
  http.get(`${apiBaseUrl}/api/v1/auth/email/register/prefetch`, () =>
    createSuccessResponse({ require_complex_password: false }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/email/resend`, () => createNoContentResponse()),
  // 设置/修改密码：200 + { relogin_required }（后端作废全部会话，不再是 204）。
  http.put(`${apiBaseUrl}/api/v1/auth/password`, () =>
    createSuccessResponse({ relogin_required: true }),
  ),

  // ── 第三方账号状态（authed）───────────────────────────────────────────────
  // 默认：github 已绑定、google 未绑定；两个 provider 都支持绑定。
  http.get(`${apiBaseUrl}/api/v1/auth/identities`, () =>
    createSuccessResponse({
      identities: [
        {
          bind_id: 'bind-1',
          provider: 'github',
          provider_email: 'octocat@github.com',
          provider_email_verified: true,
          bound_at: 1_700_000_000_000,
          last_login_at: 1_700_000_000_000,
        },
      ],
    }),
  ),
  http.get(`${apiBaseUrl}/api/v1/auth/supported-identities`, () =>
    createSuccessResponse({ identities: [{ provider: 'github' }, { provider: 'google' }] }),
  ),
]
