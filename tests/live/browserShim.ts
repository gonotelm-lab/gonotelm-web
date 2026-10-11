/**
 * 真机测试用的最小浏览器环境：node fetch 没有 cookie 容器，而前端的 http/csrf 层
 * 依赖 `document.cookie` 与浏览器自动带 cookie 的行为。
 *
 * 这里给 `document.cookie` 接上一个内存 jar，并包一层 fetch 把 jar 里的 cookie
 * 写进请求头、把响应的 Set-Cookie 收回 jar —— 于是前端代码可以原样跑在 node 里。
 */
const jar = new Map<string, string>()

export const cookieJar = jar

export const cookieHeader = () =>
  [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

export const applySetCookie = (raw: string) => {
  const pair = raw.split(';')[0] ?? ''
  const separator = pair.indexOf('=')
  if (separator < 0) {
    return
  }
  const name = pair.slice(0, separator).trim()
  const value = pair.slice(separator + 1).trim()
  if (value === '') {
    jar.delete(name)
    return
  }
  jar.set(name, value)
}

export const resetCookieJar = () => {
  jar.clear()
}

export function installBrowserShims() {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      get cookie() {
        return cookieHeader()
      },
      set cookie(raw: string) {
        applySetCookie(raw)
      },
    },
  })

  const realFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    const cookies = cookieHeader()
    if (cookies) {
      headers.set('Cookie', cookies)
    }
    const response = await realFetch(input, { ...init, headers })
    for (const raw of response.headers.getSetCookie()) {
      applySetCookie(raw)
    }
    return response
  }
}
