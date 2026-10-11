import { http } from 'msw'
import { createNoContentResponse, createSuccessResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

/** 头像上传成功后返回的直链；带时间戳以便断言旧地址被替换。 */
export const MOCK_UPLOADED_AVATAR_URL = 'https://cdn.example.com/avatars/user-1-uploaded.png'

/**
 * 邮箱注册与验证成功都是「无响应体」语义（后端用 204），
 * 口令登录成功只体现在 Set-Cookie 上，因此同样按 204 处理。
 */
export const authHandlers = [
  // 默认保持与「users_v2 改造前」的后端一致：providers 里没有 password_enabled，
  // 因此默认不渲染口令表单。需要口令表单的用例自己覆盖该 handler。
  http.get(`${apiBaseUrl}/api/v1/auth/providers`, () =>
    createSuccessResponse({ providers: [{ name: 'github' }, { name: 'google' }] }),
  ),
  http.get(`${apiBaseUrl}/api/v1/user/me`, () =>
    createSuccessResponse({
      user_id: 'user-1',
      nickname: '测试用户',
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
  // 口令登录在 `email/*` 分组下（不是 POST /auth/login）。
  http.post(`${apiBaseUrl}/api/v1/auth/email/login`, () =>
    createSuccessResponse({ user_id: 'user-1' }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/email/verify`, () =>
    createSuccessResponse({ user_id: 'user-1' }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/email/verify/code`, () =>
    createSuccessResponse({ user_id: 'user-1' }),
  ),
  // 注册/重发/设置口令成功：204 无响应体（后端 OkRespNoContent）。
  http.post(`${apiBaseUrl}/api/v1/auth/email/register`, () => createNoContentResponse()),
  http.post(`${apiBaseUrl}/api/v1/auth/email/resend`, () => createNoContentResponse()),
  http.put(`${apiBaseUrl}/api/v1/auth/password`, () => createNoContentResponse()),
]
