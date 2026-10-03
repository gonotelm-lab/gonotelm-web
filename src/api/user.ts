import { request } from '../lib/http'
import type { MeResponse, UpdateAvatarResponse, UpdateMeRequest } from '../types/api'

export function getMe() {
  return request<MeResponse>('/api/v1/user/me')
}

/** 更新当前用户资料。后端返回 204，request() 解析为 null。 */
export function updateMe(payload: UpdateMeRequest) {
  return request<null>('/api/v1/user/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * 上传头像，后端转存后返回新的头像直链。
 * 字段名必须与后端 `schema.AvatarFormField` 一致。
 */
export function uploadAvatar(file: Blob, filename: string) {
  const form = new FormData()
  form.append('avatar_file', file, filename)
  return request<UpdateAvatarResponse>('/api/v1/user/me/avatar', {
    method: 'POST',
    body: form,
  })
}
