import { http } from 'msw'
import { createNoContentResponse, createSuccessResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

export const authHandlers = [
  // 与后端一致：当前启用的第三方登录方式为 github + google。
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
  http.post(`${apiBaseUrl}/api/v1/auth/logout`, () => createNoContentResponse()),
]
