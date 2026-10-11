/**
 * 真机测试用的最小浏览器环境：node fetch 没有 cookie 容器，而前端的 http/csrf 层
 * 依赖 `document.cookie` 与浏览器自动带 cookie 的行为。
 *
 * 这里给 `document.cookie` 接上一个内存 jar，并包一层 fetch 把 jar 里的 cookie
 * 写进请求头、把响应的 Set-Cookie 收回 jar —— 于是前端代码可以原样跑在 node 里。
 */
const jar = new Map<string, string>()

export const cookieJar = jar

/**
 * 真机 UI 用例要能观察到「整页跳转」这类副作用：`redirectToLogin()` 会调
 * `window.location.assign`。这里给一个可变 location + 记录被 assign 的 URL。
 * 用例需要自己把 router 的当前位置同步进来（见 signupFlow 的 LocationSync）。
 */
export const windowLocation = {
  pathname: '/',
  search: '',
  hash: '',
  origin: 'http://127.0.0.1:5173',
  assign(url: string) {
    assignedUrls.push(url)
  },
}

export const assignedUrls: string[] = []

export const resetWindowLocation = () => {
  windowLocation.pathname = '/'
  windowLocation.search = ''
  windowLocation.hash = ''
  assignedUrls.length = 0
}

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

  // 让 redirectToLogin / absoluteReturnTo 这些读 window.location 的代码走真实分支。
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: windowLocation },
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
