import { describe, expect, it } from 'vitest'
import { HttpResponse, http } from 'msw'
import { mockServer } from '@/test/mocks'
import { createSuccessResponse } from '@/test/mocks/handlers/httpResponse'
import { uploadNotebookCoverImage } from './notebookCover'

const apiBaseUrl = 'http://127.0.0.1:4173'
const storageUrl = 'http://127.0.0.1:9000/gonotelm-public/notebooks/cover/token-1'

describe('uploadNotebookCoverImage', () => {
  it('presign 返回 headers:null 时仍要发出直传请求并 confirm', async () => {
    let uploaded = 0
    mockServer.use(
      http.post(`${apiBaseUrl}/api/v1/notebooks/:notebookId/cover/uploads`, () =>
        createSuccessResponse({
          store_key: 'encoded-store-key',
          url: storageUrl,
          method: 'POST',
          forms: {
            key: 'notebooks/cover/token-1',
            policy: 'policy-value',
            'Content-Type': 'image/png',
          },
          // Go nil map 会被序列化成 null；不能原样交给 fetch 的 Headers 构造。
          headers: null,
        }),
      ),
      http.post(storageUrl, () => {
        uploaded += 1
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(`${apiBaseUrl}/api/v1/notebooks/:notebookId/cover/confirm`, () =>
        createSuccessResponse({ cover_url: 'http://cdn.example.com/cover.webp' }),
      ),
    )

    const file = new File([new Uint8Array([1, 2, 3])], 'cover.png', {
      type: 'image/png',
    })

    await expect(
      uploadNotebookCoverImage('notebook-1', file),
    ).resolves.toBe('http://cdn.example.com/cover.webp')
    expect(uploaded).toBe(1)
  })
})
