import { describe, expect, it } from 'vitest'
import { http } from 'msw'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'
import { getMe, updateMe, uploadAvatar } from './user'

const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'
const avatarUrl = 'http://127.0.0.1:4173/api/v1/user/me/avatar'

describe('getMe', () => {
  it('解析 user_id、nickname 与 avatar_url', async () => {
    await expect(getMe()).resolves.toEqual({
      user_id: 'user-1',
      nickname: '测试用户',
      avatar_url: 'https://cdn.example.com/avatars/user-1.png',
    })
  })
})

describe('updateMe', () => {
  it('PATCH /user/me 提交昵称并把 204 解析为 null', async () => {
    let received: unknown
    mockServer.use(
      http.patch(meUrl, async ({ request }) => {
        received = await request.json()
        return createNoContentResponse()
      }),
    )

    await expect(updateMe({ nickname: '新昵称' })).resolves.toBeNull()
    expect(received).toEqual({ nickname: '新昵称' })
  })

  it('后端校验失败时抛出带消息的 ApiError', async () => {
    mockServer.use(http.patch(meUrl, () => createErrorResponse(200, 'invalid nickname', 1000)))

    await expect(updateMe({ nickname: '' })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'invalid nickname',
      code: 1000,
    })
  })
})

describe('uploadAvatar', () => {
  it('POST /user/me/avatar 以 multipart 提交 avatar_file 并解析返回的直链', async () => {
    let receivedField: string | null = null
    let receivedFileName: string | null = null
    let receivedContentType: string | null = null

    mockServer.use(
      http.post(avatarUrl, async ({ request }) => {
        receivedContentType = request.headers.get('content-type')
        const form = await request.formData()
        const entry = form.get('avatar_file')
        if (entry instanceof File) {
          receivedField = await entry.text()
          receivedFileName = entry.name
        }
        return createSuccessResponse({ avatar_url: 'https://cdn.example.com/avatars/new.png' })
      }),
    )

    const blob = new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' })
    await expect(uploadAvatar(blob, 'avatar.jpg')).resolves.toEqual({
      avatar_url: 'https://cdn.example.com/avatars/new.png',
    })

    expect(receivedContentType).toContain('multipart/form-data')
    expect(receivedField).toBe('fake-jpeg-bytes')
    expect(receivedFileName).toBe('avatar.jpg')
  })

  it('不预设 Content-Type，让浏览器自行生成 multipart boundary', async () => {
    let contentType: string | null = null
    mockServer.use(
      http.post(avatarUrl, ({ request }) => {
        contentType = request.headers.get('content-type')
        return createSuccessResponse({ avatar_url: 'https://cdn.example.com/a.png' })
      }),
    )

    await uploadAvatar(new Blob(['x']), 'a.jpg')
    // boundary 由浏览器注入；若被固定为 application/json，multipart 解析会失败。
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/)
  })

  it('后端拒绝时抛出 ApiError', async () => {
    mockServer.use(http.post(avatarUrl, () => createErrorResponse(200, 'avatar too large', 1000)))

    await expect(uploadAvatar(new Blob(['x']), 'a.jpg')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'avatar too large',
      code: 1000,
    })
  })
})
