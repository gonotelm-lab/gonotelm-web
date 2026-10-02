# Web 第三方登录集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 gonotelm-web 集成第三方登录：启动用 `/user/me` 建会话、`NOT_LOGIN` 跳登录页、全量 CSRF、账号菜单登出，并以 Studio 风格登录页替换调试页。

**Architecture:** 纯前端为主。`lib/auth.ts` 收敛跳转与 `return_to` 净化，`lib/csrf.ts` 负责双提交 cookie，`lib/http.ts` 与 `api/chat.ts` 统一接入。`AuthGate` 用共享的 `['me']` query 做启动门，`LoginPage` 拉 `/auth/providers` 整页跳转 OAuth，`AccountMenu` 展示昵称并登出。后端两项前置（CORS 头、callback 回前端源）单独列出。

**Tech Stack:** React 19、TypeScript、Vite、react-router-dom v7、@tanstack/react-query v5、MUI v9、i18next、vitest + react-test-renderer + msw。

## Global Constraints

- 仅第三方登录（当前 GitHub）；不实现注册/密码登录。
- 错误码：`2002 = NOT_LOGIN`（401）、`2003 = CSRF_TOKEN_INVALID`（403）。
- CSRF：cookie `gnlm_csrf`，请求头 `X-CSRF-Token`，仅非安全方法（非 GET/HEAD/OPTIONS）需要。
- `return_to` 净化规则必须与后端 `schema.IsSafeReturnTo` 一致：`/` 开头、非 `//`、非 `/\`、无 `\`/CR/LF，否则回退 `/`。
- 现有 API 响应包裹：`{ code: number; msg: string; data: T }`（`types/api.ts` 的 `ApiResult<T>`）。
- 测试环境为 vitest `environment: 'node'` + react-test-renderer；`window`/`document` 不可用，访问前必须 `typeof ... !== 'undefined'` 守卫，测试用 `vi.stubGlobal` 注入。
- 类型导入遵循 `verbatimModuleSyntax`（`import type`）；禁止 TS enum（`erasableSyntaxOnly`）。
- 测试命令：单测 `pnpm exec vitest run <path>`；全量 `pnpm test`；类型/构建 `pnpm build`；lint `pnpm lint`。
- **提交策略**：除非用户明确要求，执行时跳过每个 Task 末尾的 commit 步骤，仅保持工作区改动。

---

## 后端前置（可由用户完成后端改动，完成者请打勾）

### Task 0: 后端两项前置

**Files:**
- Modify: `gonotelm/pkg/http/middleware/cors.go`
- Modify: `gonotelm/pkg/http/middleware/cors_test.go`
- Modify: `gonotelm/internal/interfaces/api/notelm/schema/auth.go`（或 conf + `auth.go`）用于 `frontendBaseUrl`

**Interfaces:**
- Produces: 跨源允许 `X-CSRF-Token`；callback 重定向到 `frontendBaseUrl + sanitizedReturnTo`

- [ ] **Step 1: CORS 允许 CSRF 头**

`gonotelm/pkg/http/middleware/cors.go` 的 `corsAllowHeaders` 追加 `X-CSRF-Token`：

```go
corsAllowHeaders = strings.Join([]string{
	"Content-Type",
	"Authorization",
	"Accept",
	"X-Request-Id",
	"X-CSRF-Token",
}, ", ")
```

- [ ] **Step 2: 补 CORS 测试断言**

`cors_test.go` 的预检测试中增加：

```go
if got := w.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "X-CSRF-Token") {
	t.Errorf("Allow-Headers: got %q want it to contain X-CSRF-Token", got)
}
```

- [ ] **Step 3: 运行后端测试**

Run: `cd gonotelm && go test ./pkg/http/middleware/...`
Expected: PASS

- [ ] **Step 4: callback 回前端源（frontendBaseUrl 白名单）**

新增配置（示例放 `[auth] frontendBaseUrl`，默认空）。在 `AuthCallback` 与 `AuthLogin` 的已登录分支中，把对 `return_to` 的 `c.Redirect` 改为：

```go
returnTo := resp.ReturnTo
if returnTo == "" || !schema.IsSafeReturnTo(returnTo) {
	returnTo = "/"
}
if base := conf.NotelmGlobal().Auth.FrontendBaseURL; base != "" {
	returnTo = strings.TrimRight(base, "/") + returnTo
}
c.Redirect(stdhttp.StatusFound, []byte(returnTo))
```

开发环境设 `GONOTELM_AUTH_FRONTEND_BASE_URL=http://127.0.0.1:5173`；生产同源留空。

- [ ] **Step 5: 运行后端测试**

Run: `cd gonotelm && go test ./internal/interfaces/api/notelm/...`
Expected: PASS

- [ ] **Step 6: Commit（如需）**

```bash
git -C gonotelm add pkg/http/middleware/cors.go pkg/http/middleware/cors_test.go internal/interfaces/api/notelm/auth.go internal/conf/notelm.go etc/notelm.toml.tpl
git -C gonotelm commit -m "feat(auth): allow csrf header in cors and redirect callback to frontend base"
```

---

### Task 1: Auth 基础模块

**Files:**
- Create: `gonotelm-web/src/lib/auth.ts`
- Test: `gonotelm-web/src/lib/auth.test.ts`

**Interfaces:**
- Produces:
  - `NOT_LOGIN_CODE: 2002`、`CSRF_CODE: 2003`
  - `isNotLoginError(error: unknown): boolean`
  - `isCsrfError(error: unknown): boolean`
  - `sanitizeReturnTo(raw: string | null | undefined): string`
  - `buildLoginPath(returnTo?: string): string`
  - `redirectToLogin(): void`
  - `resetAuthRedirectForTest(): void`

- [ ] **Step 1: Write the failing test**

`gonotelm-web/src/lib/auth.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import {
  buildLoginPath,
  isCsrfError,
  isNotLoginError,
  resetAuthRedirectForTest,
  redirectToLogin,
  sanitizeReturnTo,
} from './auth'

describe('sanitizeReturnTo', () => {
  it('保留合法站内路径', () => {
    expect(sanitizeReturnTo('/notebook/a?tab=1')).toBe('/notebook/a?tab=1')
  })

  it.each([
    ['//evil.com', '/'],
    ['/\\evil', '/'],
    ['https://evil.com', '/'],
    ['notebook/a', '/'],
    ['/a\\b', '/'],
    ['/a\rb', '/'],
    ['', '/'],
    [null, '/'],
    [undefined, '/'],
  ])('非法 %s 回退 /', (raw, expected) => {
    expect(sanitizeReturnTo(raw as string)).toBe(expected)
  })
})

describe('buildLoginPath', () => {
  it('编码 return_to', () => {
    expect(buildLoginPath('/notebook/a b')).toBe('/login?return_to=%2Fnotebook%2Fa%20b')
  })

  it('空值回退根路径', () => {
    expect(buildLoginPath()).toBe('/login?return_to=%2F')
  })
})

describe('error guards', () => {
  it('识别 NOT_LOGIN 与 CSRF', () => {
    expect(isNotLoginError(new ApiError('NOT_LOGIN', 2002, 401))).toBe(true)
    expect(isNotLoginError(new ApiError('x', 1000, 200))).toBe(false)
    expect(isCsrfError(new ApiError('CSRF_TOKEN_INVALID', 2003, 403))).toBe(true)
    expect(isCsrfError(new Error('boom'))).toBe(false)
  })
})

describe('redirectToLogin', () => {
  beforeEach(() => {
    resetAuthRedirectForTest()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('跳转到登录页并携带当前路径', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/notebook/n-1', search: '?x=1', assign, origin: 'http://localhost' },
    })

    redirectToLogin()

    expect(assign).toHaveBeenCalledWith('/login?return_to=%2Fnotebook%2Fn-1%3Fx%3D1')
  })

  it('已在登录页时不跳转', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/login', search: '', assign, origin: 'http://localhost' },
    })

    redirectToLogin()

    expect(assign).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/auth.test.ts`
Expected: FAIL（`src/lib/auth.ts` 不存在）

- [ ] **Step 3: Write minimal implementation**

`gonotelm-web/src/lib/auth.ts`:

```ts
export const NOT_LOGIN_CODE = 2002
export const CSRF_CODE = 2003

type CodedError = { code?: unknown }

export function isNotLoginError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as CodedError).code === NOT_LOGIN_CODE
  )
}

export function isCsrfError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as CodedError).code === CSRF_CODE
  )
}

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) {
    return '/'
  }
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/'
  }
  if (/[\\\r\n]/.test(raw)) {
    return '/'
  }
  return raw
}

export function buildLoginPath(returnTo?: string): string {
  return `/login?return_to=${encodeURIComponent(sanitizeReturnTo(returnTo))}`
}

let redirecting = false

export function redirectToLogin(): void {
  if (redirecting || typeof window === 'undefined') {
    return
  }
  const { pathname, search } = window.location
  if (pathname === '/login') {
    return
  }
  redirecting = true
  window.location.assign(buildLoginPath(`${pathname}${search}`))
}

export function resetAuthRedirectForTest(): void {
  redirecting = false
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit（如需）**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat(web-auth): add auth primitives and return_to sanitizer"
```

---

### Task 2: CSRF 层

**Files:**
- Create: `gonotelm-web/src/lib/csrf.ts`
- Test: `gonotelm-web/src/lib/csrf.test.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_BASE_URL`
- Produces:
  - `CSRF_COOKIE_NAME = 'gnlm_csrf'`、`CSRF_HEADER_NAME = 'X-CSRF-Token'`
  - `isSafeMethod(method: string): boolean`
  - `readCsrfToken(): string`
  - `ensureCsrfToken(): Promise<string>`
  - `refreshCsrfToken(): Promise<string>`
  - `attachCsrfHeader(headers: HeadersInit | undefined, method: string): Headers`

- [ ] **Step 1: Write the failing test**

`gonotelm-web/src/lib/csrf.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachCsrfHeader,
  ensureCsrfToken,
  isSafeMethod,
  readCsrfToken,
  refreshCsrfToken,
} from './csrf'

describe('csrf', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('判定安全方法', () => {
    expect(isSafeMethod('GET')).toBe(true)
    expect(isSafeMethod('head')).toBe(true)
    expect(isSafeMethod('POST')).toBe(false)
    expect(isSafeMethod('DELETE')).toBe(false)
  })

  it('读取 gnlm_csrf cookie', () => {
    vi.stubGlobal('document', { cookie: 'a=1; gnlm_csrf=tok%2B1; b=2' })
    expect(readCsrfToken()).toBe('tok+1')
  })

  it('非安全方法附加 X-CSRF-Token', () => {
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
    const headers = attachCsrfHeader({ 'Content-Type': 'application/json' }, 'POST')
    expect(headers.get('X-CSRF-Token')).toBe('tok')
  })

  it('安全方法不附加', () => {
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
    const headers = attachCsrfHeader(undefined, 'GET')
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })

  it('cookie 缺失时通过安全请求 bootstrap 且并发共享', async () => {
    const fetchMock = vi.fn(async () => {
      vi.stubGlobal('document', { cookie: 'gnlm_csrf=fresh' })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([ensureCsrfToken(), ensureCsrfToken()])
    expect(a).toBe('fresh')
    expect(b).toBe('fresh')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshCsrfToken 重新 bootstrap', async () => {
    const fetchMock = vi.fn(async () => {
      vi.stubGlobal('document', { cookie: 'gnlm_csrf=next' })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(await refreshCsrfToken()).toBe('next')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('无 document 环境（node 测试）返回空且不请求', async () => {
    vi.stubGlobal('document', undefined)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await ensureCsrfToken()).toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/csrf.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write minimal implementation**

`gonotelm-web/src/lib/csrf.ts`:

```ts
export const CSRF_COOKIE_NAME = 'gnlm_csrf'
export const CSRF_HEADER_NAME = 'X-CSRF-Token'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase())
}

export function readCsrfToken(): string {
  if (typeof document === 'undefined' || !document.cookie) {
    return ''
  }
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex < 0) {
      continue
    }
    if (trimmed.slice(0, separatorIndex) === CSRF_COOKIE_NAME) {
      return decodeURIComponent(trimmed.slice(separatorIndex + 1))
    }
  }
  return ''
}

async function bootstrapCsrfToken(): Promise<string> {
  if (typeof document === 'undefined') {
    return ''
  }
  await fetch(`${API_BASE_URL}/api/v1/auth/providers`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  return readCsrfToken()
}

let bootstrapPromise: Promise<string> | null = null

export function ensureCsrfToken(): Promise<string> {
  const token = readCsrfToken()
  if (token || typeof document === 'undefined') {
    return Promise.resolve(token)
  }
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapCsrfToken().finally(() => {
      bootstrapPromise = null
    })
  }
  return bootstrapPromise
}

export function refreshCsrfToken(): Promise<string> {
  bootstrapPromise = null
  return bootstrapCsrfToken()
}

export function attachCsrfHeader(
  headers: HeadersInit | undefined,
  method: string,
): Headers {
  const next = new Headers(headers)
  if (!isSafeMethod(method)) {
    const token = readCsrfToken()
    if (token) {
      next.set(CSRF_HEADER_NAME, token)
    }
  }
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/csrf.test.ts`
Expected: PASS

- [ ] **Step 5: Commit（如需）**

```bash
git add src/lib/csrf.ts src/lib/csrf.test.ts
git commit -m "feat(web-auth): add double-submit csrf helpers"
```

---

### Task 3: 类型与 Auth/User API（含 msw）

**Files:**
- Modify: `gonotelm-web/src/types/api.ts`
- Modify: `gonotelm-web/src/api/auth.ts`
- Create: `gonotelm-web/src/api/user.ts`
- Create: `gonotelm-web/src/test/mocks/handlers/authHandlers.ts`
- Modify: `gonotelm-web/src/test/mocks/handlers/index.ts`
- Test: `gonotelm-web/src/api/auth.test.ts`（扩展）、`gonotelm-web/src/api/user.test.ts`

**Interfaces:**
- Consumes: `request` from `lib/http`；`ApiResult` from `types/api`
- Produces:
  - `AuthProvider { name: string }`、`AuthProvidersResponse { providers: AuthProvider[] }`、`MeResponse { user_id: string; nickname: string }`
  - `getAuthProviders(): Promise<AuthProvidersResponse>`
  - `logout(): Promise<null>`
  - `getMe(): Promise<MeResponse>`
  - msw `authHandlers`

- [ ] **Step 1: Write the failing tests**

扩展 `gonotelm-web/src/api/auth.test.ts`（在文件末尾追加）：

```ts
import { getAuthProviders, logout } from './auth'

describe('auth api', () => {
  it('getAuthProviders 解析 providers', async () => {
    await expect(getAuthProviders()).resolves.toEqual({
      providers: [{ name: 'github' }],
    })
  })

  it('logout 返回 null', async () => {
    await expect(logout()).resolves.toBeNull()
  })
})
```

新建 `gonotelm-web/src/api/user.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { getMe } from './user'

describe('getMe', () => {
  it('解析 user_id 与 nickname', async () => {
    await expect(getMe()).resolves.toEqual({ user_id: 'user-1', nickname: '测试用户' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/api/auth.test.ts src/api/user.test.ts`
Expected: FAIL（函数不存在 / 未声明请求）

- [ ] **Step 3: Add types**

`gonotelm-web/src/types/api.ts` 在 `AuthLoginFrom` 附近加入：

```ts
export interface AuthProvider {
  name: string
}

export interface AuthProvidersResponse {
  providers: AuthProvider[]
}

export interface MeResponse {
  user_id: string
  nickname: string
}
```

- [ ] **Step 4: Implement APIs**

`gonotelm-web/src/api/auth.ts` 顶部补充导入并追加函数（保留现有内容）：

```ts
import type { AuthProvidersResponse } from '../types/api'
import { request } from '../lib/http'
```

```ts
export function getAuthProviders() {
  return request<AuthProvidersResponse>('/api/v1/auth/providers')
}

export function logout() {
  return request<null>('/api/v1/auth/logout', { method: 'POST' })
}
```

新建 `gonotelm-web/src/api/user.ts`：

```ts
import { request } from '../lib/http'
import type { MeResponse } from '../types/api'

export function getMe() {
  return request<MeResponse>('/api/v1/user/me')
}
```

- [ ] **Step 5: Add msw handlers**

新建 `gonotelm-web/src/test/mocks/handlers/authHandlers.ts`：

```ts
import { http } from 'msw'
import { createNoContentResponse, createSuccessResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

export const authHandlers = [
  http.get(`${apiBaseUrl}/api/v1/auth/providers`, () =>
    createSuccessResponse({ providers: [{ name: 'github' }] }),
  ),
  http.get(`${apiBaseUrl}/api/v1/user/me`, () =>
    createSuccessResponse({ user_id: 'user-1', nickname: '测试用户' }),
  ),
  http.post(`${apiBaseUrl}/api/v1/auth/logout`, () => createNoContentResponse()),
]
```

`gonotelm-web/src/test/mocks/handlers/index.ts` 注册：

```ts
import { authHandlers } from './authHandlers'

export const handlers = [
  ...authHandlers,
  ...notebookHandlers,
  ...chatHandlers,
  ...chatSuggestionsHandlers,
  ...sourceHandlers,
  ...studioHandlers,
]
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/api/auth.test.ts src/api/user.test.ts`
Expected: PASS

- [ ] **Step 7: Run full suite to ensure新 handlers 不破坏既有测试**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit（如需）**

```bash
git add src/types/api.ts src/api/auth.ts src/api/user.ts src/api/auth.test.ts src/api/user.test.ts src/test/mocks/handlers/authHandlers.ts src/test/mocks/handlers/index.ts
git commit -m "feat(web-auth): add auth providers, me and logout api"
```

---

### Task 4: http / SSE 统一接入 CSRF 与 NOT_LOGIN

**Files:**
- Modify: `gonotelm-web/src/lib/http.ts`
- Modify: `gonotelm-web/src/api/chat.ts:186-204`
- Test: `gonotelm-web/src/lib/http.test.ts`

**Interfaces:**
- Consumes: `lib/auth`（`CSRF_CODE`、`isNotLoginError`、`redirectToLogin`）、`lib/csrf`（`attachCsrfHeader`、`ensureCsrfToken`、`isSafeMethod`、`refreshCsrfToken`）
- Produces: `request<T>` 行为变化（自动 CSRF + 2002 跳转 + 2003 重试一次）；`streamChatEvents` 2002 跳转

- [ ] **Step 1: Write the failing test**

新建 `gonotelm-web/src/lib/http.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthRedirectForTest } from './auth'
import { request } from './http'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('request csrf & auth handling', () => {
  beforeEach(() => {
    resetAuthRedirectForTest()
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('非安全方法带上 X-CSRF-Token', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { code: 0, msg: 'ok', data: null }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/v1/notebooks', { method: 'POST', body: '{}' })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok')
  })

  it('2003 刷新 token 后重试一次', async () => {
    vi.stubGlobal('document', { cookie: '' })
    let calls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/auth/providers')) {
        vi.stubGlobal('document', { cookie: 'gnlm_csrf=refreshed' })
        return jsonResponse(200, { code: 0, msg: 'ok', data: { providers: [] } })
      }
      calls += 1
      if (calls === 1) {
        return jsonResponse(403, { code: 2003, msg: 'CSRF_TOKEN_INVALID', data: null })
      }
      return jsonResponse(200, { code: 0, msg: 'ok', data: { id: 'n-1' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await request<{ id: string }>('/api/v1/notebooks', {
      method: 'POST',
      body: '{}',
    })
    expect(result).toEqual({ id: 'n-1' })
    expect(calls).toBe(2)
  })

  it('2002 触发登录跳转并上抛', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/', search: '', assign, origin: 'http://localhost' },
    })
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse(401, { code: 2002, msg: 'NOT_LOGIN', data: null }),
    ))

    await expect(request('/api/v1/user/me')).rejects.toMatchObject({ code: 2002 })
    expect(assign).toHaveBeenCalledWith('/login?return_to=%2F')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/http.test.ts`
Expected: FAIL（未附加 header / 未重试）

- [ ] **Step 3: Implement http.ts**

将 `gonotelm-web/src/lib/http.ts` 的 `request` 替换为：

```ts
import type { ApiResult } from '../types/api'
import { CSRF_CODE, isNotLoginError, redirectToLogin } from './auth'
import { attachCsrfHeader, ensureCsrfToken, isSafeMethod, refreshCsrfToken } from './csrf'

export class ApiError extends Error {
  readonly code: number
  readonly status: number

  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const parseBody = async <T>(response: Response): Promise<ApiResult<T> | null> => {
  try {
    return (await response.json()) as ApiResult<T>
  } catch {
    return null
  }
}

export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const unsafe = !isSafeMethod(method)

  const send = async (): Promise<Response> => {
    if (unsafe) {
      await ensureCsrfToken()
    }
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method,
      credentials: 'include',
      headers: attachCsrfHeader(
        { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        method,
      ),
    })
  }

  let response = await send()
  let body = await parseBody<T>(response)

  if (unsafe && response.status === 403 && body?.code === CSRF_CODE) {
    await refreshCsrfToken()
    response = await send()
    body = await parseBody<T>(response)
  }

  if (!response.ok) {
    const error = new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
    if (isNotLoginError(error)) {
      redirectToLogin()
    }
    throw error
  }

  if (response.status === 204) {
    return null as T
  }

  if (!body) {
    throw new ApiError('Empty response body', -1, response.status)
  }

  if (body.code !== 0) {
    const error = new ApiError(body.msg, body.code, response.status)
    if (isNotLoginError(error)) {
      redirectToLogin()
    }
    throw error
  }

  return body.data
}
```

- [ ] **Step 4: Implement streamChatEvents NOT_LOGIN**

在 `gonotelm-web/src/api/chat.ts` 顶部补充：

```ts
import { isNotLoginError, redirectToLogin } from '../lib/auth'
```

把 `!response.ok` 分支改为：

```ts
  if (!response.ok) {
    const body = await tryParseApiResult<unknown>(response)
    const error = new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
    if (isNotLoginError(error)) {
      redirectToLogin()
    }
    throw error
  }
```

把 JSON body 分支改为：

```ts
    if (body && body.code !== 0) {
      const error = new ApiError(body.msg, body.code, response.status)
      if (isNotLoginError(error)) {
        redirectToLogin()
      }
      throw error
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/http.test.ts`
Expected: PASS

- [ ] **Step 6: Run full suite（确认既有 mutating 测试仍绿，node 下 CSRF 为 no-op）**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit（如需）**

```bash
git add src/lib/http.ts src/lib/http.test.ts src/api/chat.ts
git commit -m "feat(web-auth): attach csrf header, retry once and redirect on not-login"
```

---

### Task 5: useMeQuery 与 AuthGate

**Files:**
- Create: `gonotelm-web/src/components/auth/useMeQuery.ts`
- Create: `gonotelm-web/src/components/auth/AuthGate.tsx`
- Test: `gonotelm-web/src/components/auth/AuthGate.test.tsx`

**Interfaces:**
- Consumes: `getMe` from `api/user`；`isNotLoginError` from `lib/auth`；msw `GET /user/me`；i18n `auth:gate.*`
- Produces: `ME_QUERY_KEY = ['me']`；`useMeQuery()`；`AuthGate({ children })`

- [ ] **Step 1: Write the failing test**

`gonotelm-web/src/components/auth/AuthGate.test.tsx`：

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { mockServer } from '@/test/mocks'
import { createErrorResponse } from '@/test/mocks/handlers/httpResponse'
import { AuthGate } from './AuthGate'

const renderGate = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <span data-testid="protected">secret</span>
        </AuthGate>
      </QueryClientProvider>,
    )
  })
  await act(async () => {})
  return renderer
}

describe('AuthGate', () => {
  it('会话有效时渲染子内容', async () => {
    const renderer = await renderGate()
    expect(renderer.root.findByProps({ 'data-testid': 'protected' })).toBeTruthy()
  })

  it('NOT_LOGIN 时渲染占位而非子内容', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/user/me', () =>
        createErrorResponse(401, 'NOT_LOGIN', 2002),
      ),
    )
    const renderer = await renderGate()
    expect(renderer.root.findByProps({ 'data-testid': 'auth-gate-loading' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'protected' })).toHaveLength(0)
  })

  it('其他错误渲染重试态', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/user/me', () =>
        createErrorResponse(500, 'boom', 500_001),
      ),
    )
    const renderer = await renderGate()
    expect(renderer.root.findByProps({ 'data-testid': 'auth-gate-error' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/auth/AuthGate.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Implement useMeQuery**

`gonotelm-web/src/components/auth/useMeQuery.ts`：

```ts
import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/user'

export const ME_QUERY_KEY = ['me'] as const

export function useMeQuery() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
  })
}
```

- [ ] **Step 4: Implement AuthGate**

`gonotelm-web/src/components/auth/AuthGate.tsx`：

```tsx
import type { ReactNode } from 'react'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { isNotLoginError } from '@/lib/auth'
import { useMeQuery } from './useMeQuery'

export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation('auth')
  const { isPending, isError, error, refetch } = useMeQuery()

  if (isPending || (isError && isNotLoginError(error))) {
    return (
      <Box
        data-testid="auth-gate-loading"
        sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}
      >
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Stack
        data-testid="auth-gate-error"
        spacing={2}
        sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('gate.error')}
        </Typography>
        <Button variant="outlined" onClick={() => void refetch()}>
          {t('gate.retry')}
        </Button>
      </Stack>
    )
  }

  return <>{children}</>
}
```

> 依赖 Task 6 的 i18n key；若尚未写入 `auth:gate.error`，i18next 会回显 key，测试不依赖文案。

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/auth/AuthGate.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit（如需）**

```bash
git add src/components/auth/useMeQuery.ts src/components/auth/AuthGate.tsx src/components/auth/AuthGate.test.tsx
git commit -m "feat(web-auth): add me query and auth gate"
```

---

### Task 6: auth i18n 命名空间

**Files:**
- Create: `gonotelm-web/src/locales/zh/auth.json`
- Create: `gonotelm-web/src/locales/en/auth.json`
- Modify: `gonotelm-web/src/i18n/index.ts`

**Interfaces:**
- Produces: i18n namespace `auth`，key：`login.brand/title/subtitle/loading/error/retry/empty/continueWith`、`gate.error/retry`、`account.menuAria/logout/loggingOut`、`provider.github`

- [ ] **Step 1: Write locale files**

`gonotelm-web/src/locales/zh/auth.json`：

```json
{
  "login": {
    "brand": "GoNoteLM",
    "title": "登录",
    "subtitle": "选择一种方式继续",
    "loading": "正在加载登录方式…",
    "error": "加载登录方式失败，请重试。",
    "retry": "重试",
    "empty": "当前没有可用的登录方式。",
    "continueWith": "使用 {{provider}} 登录"
  },
  "gate": {
    "error": "会话校验失败，请重试。",
    "retry": "重试"
  },
  "account": {
    "menuAria": "账号菜单",
    "logout": "退出登录",
    "loggingOut": "退出中…"
  },
  "provider": {
    "github": "GitHub"
  }
}
```

`gonotelm-web/src/locales/en/auth.json`：

```json
{
  "login": {
    "brand": "GoNoteLM",
    "title": "Sign in",
    "subtitle": "Choose a method to continue",
    "loading": "Loading sign-in options…",
    "error": "Failed to load sign-in options. Please retry.",
    "retry": "Retry",
    "empty": "No sign-in method is available.",
    "continueWith": "Continue with {{provider}}"
  },
  "gate": {
    "error": "Session check failed. Please retry.",
    "retry": "Retry"
  },
  "account": {
    "menuAria": "Account menu",
    "logout": "Sign out",
    "loggingOut": "Signing out…"
  },
  "provider": {
    "github": "GitHub"
  }
}
```

- [ ] **Step 2: Register namespace**

`gonotelm-web/src/i18n/index.ts` 增加导入：

```ts
import authZh from '../locales/zh/auth.json'
import authEn from '../locales/en/auth.json'
```

在 `resources.zh` 与 `resources.en` 分别加 `auth: authZh` / `auth: authEn`，并把 `ns` 数组改为：

```ts
ns: ['common', 'home', 'workspace', 'sources', 'studio', 'chat', 'auth'],
```

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: PASS（tsc 无错误）

- [ ] **Step 4: Commit（如需）**

```bash
git add src/locales/zh/auth.json src/locales/en/auth.json src/i18n/index.ts
git commit -m "feat(web-auth): add auth i18n namespace"
```

---

### Task 7: 登录页

**Files:**
- Create: `gonotelm-web/src/pages/LoginPage.tsx`
- Test: `gonotelm-web/src/pages/LoginPage.test.tsx`
- Delete: `gonotelm-web/src/pages/LoginDebugPage.tsx`

**Interfaces:**
- Consumes: `getAuthProviders` from `api/auth`；`goToAuthLogin` from `api/auth`；`sanitizeReturnTo` from `lib/auth`；`useMeQuery`；i18n `auth:login.*`
- Produces: `LoginPage`；provider 显示名 `providerLabel(name, t)`（内部）

- [ ] **Step 1: Write the failing test**

`gonotelm-web/src/pages/LoginPage.test.tsx`：

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import { createErrorResponse, createSuccessResponse } from '@/test/mocks/handlers/httpResponse'
import { LoginPage } from './LoginPage'

const renderLogin = async () => {
  // 覆盖默认 /user/me 成功 handler：未登录才能渲染 providers 表单
  mockServer.use(
    http.get('http://127.0.0.1:4173/api/v1/user/me', () =>
      createErrorResponse(401, 'NOT_LOGIN', 2002),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login?return_to=%2Fnotebook%2Fn-1']}>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return renderer
}

describe('LoginPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('展示 providers 并点击触发整页跳转', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign, pathname: '/login', search: '', origin: 'http://localhost' } })

    const renderer = await renderLogin()
    const button = renderer.root.findByProps({ 'data-provider': 'github' })
    act(() => button.props.onClick())

    expect(assign).toHaveBeenCalledWith(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=%2Fnotebook%2Fn-1',
    )
  })

  it('providers 为空时展示空态', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/auth/providers', () =>
        createSuccessResponse({ providers: [] }),
      ),
    )
    const renderer = await renderLogin()
    expect(renderer.root.findByProps({ 'data-testid': 'login-empty' })).toBeTruthy()
  })

  it('providers 出错时展示错误态与重试', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/auth/providers', () =>
        createErrorResponse(500, 'boom', 500_001),
      ),
    )
    const renderer = await renderLogin()
    expect(renderer.root.findByProps({ 'data-testid': 'login-error' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Implement LoginPage**

`gonotelm-web/src/pages/LoginPage.tsx`：

```tsx
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { getAuthProviders, goToAuthLogin } from '../api/auth'
import { sanitizeReturnTo } from '../lib/auth'
import { useMeQuery } from '../components/auth/useMeQuery'
import { workspaceSpace, workspaceRadiusPx } from '../components/notebook-workspace/shared/ui/layoutTokens'

function providerLabel(name: string, t: (key: string) => string): string {
  const known = t(`provider.${name}`)
  return known === `provider.${name}` ? name : known
}

function ProviderIcon({ name }: { name: string }) {
  if (name === 'github') {
    return <GitHubIcon fontSize="small" />
  }
  return null
}

export function LoginPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  const meQuery = useMeQuery()

  const providersQuery = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: getAuthProviders,
    retry: false,
  })

  if (meQuery.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (meQuery.isSuccess) {
    window.location.assign(returnTo)
    return null
  }

  const providers = providersQuery.data?.providers ?? []

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: workspaceSpace.lg,
      }}
    >
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 380, p: workspaceSpace.lg, borderRadius: workspaceRadiusPx.lg }}
      >
        <Stack spacing={workspaceSpace.md}>
          <Stack spacing={workspaceSpace.xxs}>
            <Typography variant="h5">{t('login.brand')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('login.subtitle')}
            </Typography>
          </Stack>

          {providersQuery.isPending ? (
            <Stack sx={{ py: workspaceSpace.lg, alignItems: 'center' }}>
              <CircularProgress size={18} />
            </Stack>
          ) : providersQuery.isError ? (
            <Stack data-testid="login-error" spacing={workspaceSpace.sm}>
              <Typography variant="body2" color="text.secondary">
                {t('login.error')}
              </Typography>
              <Button variant="outlined" onClick={() => void providersQuery.refetch()}>
                {t('login.retry')}
              </Button>
            </Stack>
          ) : providers.length === 0 ? (
            <Typography data-testid="login-empty" variant="body2" color="text.secondary">
              {t('login.empty')}
            </Typography>
          ) : (
            <Stack spacing={workspaceSpace.sm}>
              {providers.map((provider) => {
                const label = providerLabel(provider.name, t)
                return (
                  <Button
                    key={provider.name}
                    data-provider={provider.name}
                    variant="contained"
                    startIcon={<ProviderIcon name={provider.name} />}
                    onClick={() => goToAuthLogin({ provider: provider.name, from: 'web', returnTo })}
                  >
                    {t('login.continueWith', { provider: label })}
                  </Button>
                )
              })}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
```

> `layoutTokens.ts` 导出 `workspaceRadiusPx`（数字 px，用于 MUI `borderRadius`）与 `workspaceRadius`（字符串）。此处用 `workspaceRadiusPx.lg`。

- [ ] **Step 4: Delete debug page and its route**

`LoginDebugPage.tsx` 是未跟踪文件，直接删除；同时把 `src/app/router.tsx` 里 `/debug/login` 路由与 `LoginDebugPage` import 去掉（该文件当前带未提交 WIP 改动），避免 tsc 报找不到模块。Task 9 会再整体重写 router。

```bash
rm src/pages/LoginDebugPage.tsx
```

在 `src/app/router.tsx` 删除 `import { LoginDebugPage } ...` 与 `{ path: '/debug/login', element: <LoginDebugPage /> }` 块。

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/pages/LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit（如需）**

```bash
git add src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/app/router.tsx
git commit -m "feat(web-auth): add studio-style login page and remove debug page"
```

---

### Task 8: 账号菜单与登出

**Files:**
- Create: `gonotelm-web/src/components/auth/AccountMenu.tsx`
- Test: `gonotelm-web/src/components/auth/AccountMenu.test.tsx`

**Interfaces:**
- Consumes: `logout` from `api/auth`；`useMeQuery`；i18n `auth:account.*`
- Produces: `AccountMenu()`

- [ ] **Step 1: Write the failing test**

`gonotelm-web/src/components/auth/AccountMenu.test.tsx`：

> node 测试环境没有 DOM，MUI `Menu` 走 Portal 无法渲染，沿用仓库既有做法（见 `WorkspaceMobileTabBar.test.tsx`）：`vi.mock('@mui/material')` 用简单元素替换。

```tsx
import type { ReactNode, MouseEvent } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@mui/material', () => ({
  IconButton: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Menu: ({ children, open }: { children?: ReactNode; open?: boolean; anchorEl?: unknown; onClose?: () => void }) =>
    open ? <div data-testid="account-menu">{children}</div> : null,
  MenuItem: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Typography: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('@mui/icons-material/AccountCircleOutlined', () => ({ default: () => null }))

import { AccountMenu } from './AccountMenu'

const renderMenu = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <AccountMenu />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return renderer
}

const openMenu = (renderer: ReactTestRenderer) => {
  const trigger = renderer.root.findByProps({ 'data-testid': 'account-trigger' })
  act(() => trigger.props.onClick({ currentTarget: {} } as MouseEvent<HTMLElement>))
}

describe('AccountMenu', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('打开菜单展示昵称与退出项', async () => {
    const renderer = await renderMenu()
    openMenu(renderer)
    expect(
      renderer.root.findByProps({ 'data-testid': 'account-nickname' }).children.join(''),
    ).toBe('测试用户')
    expect(renderer.root.findByProps({ 'data-testid': 'account-logout' })).toBeTruthy()
  })

  it('点击退出登录调用接口并回登录页', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign, pathname: '/', search: '', origin: 'http://localhost' } })
    const renderer = await renderMenu()
    openMenu(renderer)
    await act(async () => {
      await renderer.root.findByProps({ 'data-testid': 'account-logout' }).props.onClick()
    })
    expect(assign).toHaveBeenCalledWith('/login')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/auth/AccountMenu.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Implement AccountMenu**

`gonotelm-web/src/components/auth/AccountMenu.tsx`：

```tsx
import { useState, type MouseEvent } from 'react'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { logout } from '../../api/auth'
import { useMeQuery } from './useMeQuery'

export function AccountMenu() {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const { data } = useMeQuery()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const nickname = data?.nickname ?? data?.user_id ?? ''

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    if (!isLoggingOut) {
      setAnchorEl(null)
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
    }
  }

  return (
    <>
      <IconButton
        data-testid="account-trigger"
        size="small"
        aria-label={t('account.menuAria')}
        onClick={handleOpen}
      >
        <AccountCircleOutlinedIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography data-testid="account-nickname" variant="body2" color="text.secondary">
            {nickname}
          </Typography>
        </MenuItem>
        <MenuItem
          data-testid="account-logout"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          {isLoggingOut ? t('account.loggingOut') : t('account.logout')}
        </MenuItem>
      </Menu>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/auth/AccountMenu.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit（如需）**

```bash
git add src/components/auth/AccountMenu.tsx src/components/auth/AccountMenu.test.tsx
git commit -m "feat(web-auth): add account menu with logout"
```

---

### Task 9: 路由与页面接线

**Files:**
- Modify: `gonotelm-web/src/app/router.tsx`
- Modify: `gonotelm-web/src/pages/HomePage.tsx`
- Modify: `gonotelm-web/src/components/notebook-workspace/layout/WorkspaceHeader.tsx`

**Interfaces:**
- Consumes: `AuthGate`、`LoginPage`、`AccountMenu`
- Produces: 受保护路由行为、账号菜单入口

- [ ] **Step 1: Rewrite router**

`gonotelm-web/src/app/router.tsx`：

```tsx
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AuthGate } from '../components/auth/AuthGate'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotebookWorkspacePage } from '../pages/NotebookWorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGate>
        <HomePage />
      </AuthGate>
    ),
  },
  {
    path: '/notebook/:id',
    element: (
      <AuthGate>
        <NotebookWorkspacePage />
      </AuthGate>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
```

- [ ] **Step 2: Add HomePage header with AccountMenu**

`gonotelm-web/src/pages/HomePage.tsx`：补充导入

```tsx
import { Typography } from '@mui/material'
import { AccountMenu } from '../components/auth/AccountMenu'
```

把顶部空 `Stack` 替换为：

```tsx
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">GoNoteLM</Typography>
          <AccountMenu />
        </Stack>
```

- [ ] **Step 3: Add AccountMenu to WorkspaceHeader**

`gonotelm-web/src/components/notebook-workspace/layout/WorkspaceHeader.tsx`：补充导入

```tsx
import { AccountMenu } from '../../auth/AccountMenu'
```

在右侧操作区（`ml: 'auto'` 的 `Box` 内）删除按钮之前加入：

```tsx
          <AccountMenu />
```

- [ ] **Step 4: Typecheck / lint / full test**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 5: 手工验证（无自动化路由器测试）**

1. 未登录访问 `/` → 跳 `/login?return_to=%2F`。
2. 点击 GitHub → 跳后端 `/auth/login` → GitHub → 回调 → `frontendBaseUrl + /`，回到首页且账号菜单显示昵称。
3. 访问 `/login`（已登录）→ 自动跳 `/`。
4. 点击退出登录 → 回 `/login`。
5. 建/删 notebook、发消息均不报 403 CSRF。
6. 访问 `/debug/login` → 重定向 `/`。

- [ ] **Step 6: Commit（如需）**

```bash
git add src/app/router.tsx src/pages/HomePage.tsx src/components/notebook-workspace/layout/WorkspaceHeader.tsx
git commit -m "feat(web-auth): wire auth gate, login route and account menu"
```

---

## Self-Review

**Spec coverage：**
- CSRF 双提交 → Task 2 + Task 4 ✓
- 启动 `/user/me` 会话门 → Task 5 + Task 9 ✓
- 任意接口 NOT_LOGIN 跳转 → Task 1 + Task 4 ✓
- 登录页 providers 四态 → Task 7 ✓
- 已登录访问 `/login` 短路 → Task 7（`meQuery.isSuccess` → `assign(returnTo)`）✓
- return_to 净化 → Task 1（镜像 `IsSafeReturnTo`）✓
- 账号菜单 / 登出 → Task 8 + Task 9 ✓
- 删除 debug 页与路由 → Task 7 + Task 9 ✓
- i18n `auth` → Task 6 ✓
- 后端 CORS / frontendBaseUrl 前置 → Task 0 ✓
- 开发期 127.0.0.1:5173 提示 → Global Constraints / Task 9 手工验证 ✓

**Placeholder scan：** 无 TBD/TODO；所有代码步骤含完整代码。

**Type consistency：** `request<T>` 签名不变；`ApiError` 仍从 `lib/http` 导出；`ME_QUERY_KEY`、`useMeQuery`、`isNotLoginError`、`sanitizeReturnTo`、`buildLoginPath`、`attachCsrfHeader`、`ensureCsrfToken`、`refreshCsrfToken`、`isSafeMethod` 命名在任务间一致；msw 基址统一 `http://127.0.0.1:4173`。

**已知实现注意：**
- `LoginPage` 在 `meQuery.isSuccess` 时用 `window.location.assign` 而非 `<Navigate>`，与测试的 `window` stub 一致；如需 SPA 内跳转可改用 `useNavigate`。
- `AccountMenu` 退出后走不带 `return_to` 的 `/login`。
- LoginPage 圆角使用 `workspaceRadiusPx.lg`（数字 12），勿写成 `workspaceRadius.lg + 'px'`。
