import { http } from 'msw'
import { createNoContentResponse, createSuccessResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

/** 头像上传成功后返回的直链；带时间戳以便断言旧地址被替换。 */
export const MOCK_UPLOADED_AVATAR_URL = 'https://cdn.example.com/avatars/user-1-uploaded.png'

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
  // 后端 PATCH /user/me 成功返回 204 空响应。
  http.patch(`${apiBaseUrl}/api/v1/user/me`, () => createNoContentResponse()),
  // 后端 POST /user/me/avatar 成功返回 200 + { avatar_url }。
  http.post(`${apiBaseUrl}/api/v1/user/me/avatar`, () =>
    createSuccessResponse({ avatar_url: MOCK_UPLOADED_AVATAR_URL }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/logout`, () => createNoContentResponse()),
]
