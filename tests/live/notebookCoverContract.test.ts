import { Buffer } from 'node:buffer'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
// 必须在 installBrowserShims 之前完成初始化：i18n 读 document.documentElement.lang，
// 而 shim 的 document 只有 cookie 容器（与 signupFlow 的加载顺序保持一致）。
import '@/i18n'
import { installBrowserShims, resetCookieJar } from './browserShim'

/**
 * 真机契约测试：笔记本封面三步走（presign → 对象存储直传 → confirm）与删除。
 *
 *   GNLM_LIVE_AUTH=1 npx vitest run --config vitest.live.config.ts
 *
 * 本地部署默认 auth.emailVerificationRequired=false：注册即建号并签发会话。
 * 用一个 1×1 PNG 走对象存储 POST policy（声明 size/content_type 与文件一致）；
 * 服务端在 confirm 时校验 mimetype 与尺寸。前端 16:9 重编码不在本探针范围内。
 */

const live = process.env.GNLM_LIVE_AUTH === '1'

const onePixelPng = () =>
  new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  )

const errorCode = (error: unknown) => (error as { code?: number }).code

describe.skipIf(!live)('live backend · notebook cover 契约', () => {
  let auth: typeof import('@/api/auth')
  let notebookApi: typeof import('@/api/notebook')
  let coverApi: typeof import('@/api/notebookCover')
  const createdNotebookIds: string[] = []

  beforeAll(async () => {
    installBrowserShims()
    // 必须在 shim 之后加载：http/csrf 在模块顶层读 import.meta.env 与 document。
    auth = await import('@/api/auth')
    notebookApi = await import('@/api/notebook')
    coverApi = await import('@/api/notebookCover')

    const email = `cover-live-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.invalid`
    const registered = await auth.registerEmail({
      email,
      password: 'Cover-Live-1',
    })
    if (!registered.email_verified) {
      throw new Error(
        '本机后端开启了邮箱验证；cover live 探针需要 auth.emailVerificationRequired=false 的部署',
      )
    }
  })

  afterAll(async () => {
    for (const id of createdNotebookIds) {
      await notebookApi.deleteNotebook(id).catch(() => {})
    }
    await auth.logout().catch(() => {})
    resetCookieJar()
  })

  const createNotebook = async (name: string) => {
    const { id } = await notebookApi.createNotebook({ name })
    createdNotebookIds.push(id)
    return id
  }

  it('presign 幂等：同一在途窗口内重复申请返回同一 store_key', async () => {
    const notebookId = await createNotebook('封面 presign 幂等')
    const size = onePixelPng().length
    const first = await coverApi.presignCoverUpload(notebookId, {
      content_type: 'image/png',
      size,
    })
    const second = await coverApi.presignCoverUpload(notebookId, {
      content_type: 'image/png',
      size,
    })

    expect(first.store_key).toBe(second.store_key)
    expect(first.url).toMatch(/^https?:\/\//)
    expect(first.forms?.key).toBeTruthy()
    // policy 精确钉住 content-type（前端直传时原样回填 forms）。
    expect(first.forms?.['Content-Type']).toBe('image/png')
  })

  it('presign → 直传 → confirm → Get/List 带 cover_url → DELETE 清空（再次 DELETE 幂等）', async () => {
    const notebookId = await createNotebook('封面主流程')
    const png = onePixelPng()

    // 新笔记本无封面
    expect((await notebookApi.getNotebook(notebookId)).cover_url ?? '').toBe('')

    const coverUrl = await coverApi.uploadNotebookCoverImage(
      notebookId,
      new File([png], 'cover.png', { type: 'image/png' }),
    )
    expect(coverUrl).toMatch(/^https?:\/\//)
    expect(coverUrl).toContain('notebooks/cover/')

    // 详情
    expect((await notebookApi.getNotebook(notebookId)).cover_url).toBe(coverUrl)

    // 列表（首页卡片背景依赖 List 的 cover_url）
    const list = await notebookApi.listNotebooks({ scope: 'owned', limit: 50, offset: 0 })
    expect(list.notebooks.find((item) => item.id === notebookId)?.cover_url).toBe(coverUrl)

    // 删除 → 清空；幂等再删仍成功
    await expect(coverApi.deleteNotebookCover(notebookId)).resolves.toBeNull()
    expect((await notebookApi.getNotebook(notebookId)).cover_url ?? '').toBe('')
    await expect(coverApi.deleteNotebookCover(notebookId)).resolves.toBeNull()
  })

  it('presign 参数校验：非白名单类型 / 超过 2MB → 100016', async () => {
    const notebookId = await createNotebook('封面参数校验')

    await expect(
      coverApi.presignCoverUpload(notebookId, {
        content_type: 'image/gif',
        size: 1024,
      }),
    ).rejects.toSatisfy((error: unknown) => errorCode(error) === 100016)

    await expect(
      coverApi.presignCoverUpload(notebookId, {
        content_type: 'image/png',
        size: 2 * 1024 * 1024 + 1,
      }),
    ).rejects.toSatisfy((error: unknown) => errorCode(error) === 100016)
  })

  it('confirm 绑定校验：伪造 key / 未直传的 key → 100016，且不改动封面', async () => {
    const notebookId = await createNotebook('封面绑定校验')

    await expect(
      coverApi.confirmCoverUpload(notebookId, 'forged-key'),
    ).rejects.toSatisfy((error: unknown) => errorCode(error) === 100016)

    // 合法 presign 但从未直传：对象不存在 → 拒绝，旧封面保持不变（这里是「无封面」）。
    const presign = await coverApi.presignCoverUpload(notebookId, {
      content_type: 'image/png',
      size: onePixelPng().length,
    })
    await expect(
      coverApi.confirmCoverUpload(notebookId, presign.store_key),
    ).rejects.toSatisfy((error: unknown) => errorCode(error) === 100016)

    expect((await notebookApi.getNotebook(notebookId)).cover_url ?? '').toBe('')
  })
})
