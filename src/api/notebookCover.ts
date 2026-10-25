import { request } from '../lib/http'
import type {
  ConfirmCoverUploadResponse,
  PresignCoverUploadRequest,
  PresignCoverUploadResponse,
} from '../types/api'

/**
 * 笔记本封面三步走的 API 层（契约见 gonotelm spec 2026-10-25-notebook-custom-cover）：
 * presign → 对象存储直传 → confirm；删除独立走 DELETE。
 */

export function presignCoverUpload(
  notebookId: string,
  payload: PresignCoverUploadRequest,
) {
  return request<PresignCoverUploadResponse>(
    `/api/v1/notebooks/${notebookId}/cover/uploads`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function confirmCoverUpload(notebookId: string, storeKey: string) {
  return request<ConfirmCoverUploadResponse>(
    `/api/v1/notebooks/${notebookId}/cover/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ store_key: storeKey }),
    },
  )
}

/** 删除封面；后端幂等（无封面时也返回成功），前端按成功即清空状态处理。 */
export function deleteNotebookCover(notebookId: string) {
  return request<null>(`/api/v1/notebooks/${notebookId}/cover`, {
    method: 'DELETE',
  })
}

/**
 * presign 直传对象存储并 confirm，返回生效的封面直链。
 * forms 必须排在 file 之前，与 S3 POST policy 的签名语义一致（source 上传同款约束）。
 */
export async function uploadNotebookCoverImage(
  notebookId: string,
  file: File,
): Promise<string> {
  const presign = await presignCoverUpload(notebookId, {
    content_type: file.type,
    size: file.size,
  })

  const form = new FormData()
  Object.entries(presign.forms ?? {}).forEach(([key, value]) => {
    form.append(key, value)
  })
  form.append('file', file)

  const response = await fetch(presign.url, {
    method: presign.method || 'POST',
    body: form,
    // 后端 nil map 会序列化成 null；Headers 只接受 undefined/HeadersInit，
    // 直接传 null 会在发出请求前同步抛 TypeError（表现为“上传没触发”）。
    headers: presign.headers ?? undefined,
  })

  if (!response.ok) {
    throw new Error(
      `cover object storage upload failed with status ${response.status}`,
    )
  }

  const confirmed = await confirmCoverUpload(notebookId, presign.store_key)
  return confirmed.cover_url
}
