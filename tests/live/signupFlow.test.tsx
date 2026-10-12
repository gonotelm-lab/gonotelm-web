import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { useEffect } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import {
  assignedUrls,
  installBrowserShims,
  resetCookieJar,
  resetWindowLocation,
  windowLocation,
} from './browserShim'

/**
 * 真机 UI 流程：登录页「创建账号」→ 前端注册页 → 真实注册。
 *
 *   GNLM_LIVE_AUTH=1 npx vitest run --config vitest.live.config.ts
 *
 * 走的是真实后端（127.0.0.1:7099）+ 真实前端组件，不挂 MSW：
 * 组件树用 react-test-renderer 渲染，网络用 browserShim 的 cookie jar 打通。
 * 只写一条 pending（不发账号），跑完删掉 Redis 里的 pending 键。
 */

const live = process.env.GNLM_LIVE_AUTH === '1'
const sha = (raw: string) => createHash('sha256').update(raw).digest('hex')

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

/**
 * 把 router 的当前位置同步给 window.location，这样 redirectToLogin() 之类的
 * 「整页跳转」代码在测试里走的是真实分支（否则 window 不存在，副作用被静默吞掉）。
 */
function LocationSync() {
  const location = useLocation()
  useEffect(() => {
    windowLocation.pathname = location.pathname
    windowLocation.search = location.search
    windowLocation.hash = location.hash
  }, [location.pathname, location.search, location.hash])
  return null
}

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const waitFor = async (predicate: () => boolean, timeoutMs = 5000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    await flush()
    if (predicate()) {
      return
    }
  }
  throw new Error('waitFor timed out')
}

const renderAt = async (entry: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <LocationSync />
          <LocationProbe />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<div data-testid="verify-landed" />} />
            {/* 免验证部署下注册成功直接进 return_to，业务页得有个落点 */}
            <Route path="/notebook/n-1" element={<div data-testid="home-landed" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await flush()
  return renderer
}

const locationOf = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'location' }).children.join('')

const fill = (renderer: ReactTestRenderer, testId: string, value: string) => {
  act(() => {
    renderer.root.findByProps({ 'data-testid': testId }).props.onChange({ target: { value } })
  })
}

const signupEmail = `web-ui-signup-${Date.now()}@example.invalid`

const redisDel = (...keys: string[]) => {
  for (const key of keys) {
    execFileSync('redis-cli', ['-h', '127.0.0.1', '-p', '7542', 'DEL', key], { encoding: 'utf8' })
  }
}

describe.skipIf(!live)('live UI · 创建账号 → 注册页 → 执行注册', () => {
  beforeAll(async () => {
    installBrowserShims()
    await import('@/i18n')
  })

  beforeEach(() => {
    resetWindowLocation()
  })

  afterAll(() => {
    redisDel(
      `gonotelm:identity:signup:${sha(signupEmail)}`,
      `gonotelm:identity:signup:attempts:${sha(signupEmail)}`,
    )
    resetCookieJar()
  })

  it('登录页拿到 password_enabled 后渲染邮箱表单与「创建账号」入口', async () => {
    const renderer = await renderAt('/login')
    await waitFor(() => renderer.root.findAllByProps({ 'data-testid': 'login-email-input' }).length > 0)

    const link = renderer.root
      .findAllByProps({ 'data-testid': 'login-signup-link' })
      .find((node) => typeof node.props.to === 'string')
    expect(link?.props.to).toContain('/signup?return_to=')
  })

  it('点「创建账号」跳到前端注册页（站内路由，不整页刷新）', async () => {
    const renderer = await renderAt('/login')
    await waitFor(() => renderer.root.findAllByProps({ 'data-testid': 'login-signup-link' }).length > 0)

    // Box → Link → <a>：onClick 挂在宿主 a 上，href 由 to 生成。
    const link = renderer.root
      .findAllByProps({ 'data-testid': 'login-signup-link' })
      .find((node) => typeof node.props.onClick === 'function')
    expect(link).toBeTruthy()
    expect(String(link?.props.href)).toContain('/signup?return_to=')

    act(() => {
      link?.props.onClick({
        button: 0,
        defaultPrevented: false,
        preventDefault() {},
        metaKey: false,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
      })
    })
    await flush()

    expect(locationOf(renderer)).toContain('/signup')
    // 注册页要等 /user/me 返回 2002 之后才渲染表单（未登录态）。
    await waitFor(() => renderer.root.findAllByProps({ 'data-testid': 'signup-email-input' }).length > 0)
    expect(renderer.root.findByProps({ 'data-testid': 'signup-email-input' })).toBeTruthy()

    // 关键回归：注册页探 /user/me 得到的 2002 不能触发整页跳回登录页。
    expect(assignedUrls).toEqual([])
    expect(windowLocation.pathname).toBe('/signup')
  })

  it('注册页提交后真实注册成功：免验证直接进 return_to，需验证则跳验证页', async () => {
    const renderer = await renderAt('/signup?return_to=%2Fnotebook%2Fn-1')
    await waitFor(() => renderer.root.findAllByProps({ 'data-testid': 'signup-email-input' }).length > 0)

    fill(renderer, 'signup-email-input', signupEmail)
    // 后端 requireComplexPassword=true：密码必须同时含大小写与数字，否则前端不会发请求。
    fill(renderer, 'signup-password-input', 'Web-Ui-Pass-123')
    fill(renderer, 'signup-confirm-input', 'Web-Ui-Pass-123')

    await act(async () => {
      renderer.root.findByType('form').props.onSubmit({ preventDefault() {} })
    })

    // 部署开关 auth.emailVerificationRequired 决定注册结果：
    //   false（本机默认）→ 后端已建号签发会话，响应 email_verified=true，前端直接进 return_to；
    //   true            → 只写 pending，前端跳验证页。
    // 真机测试要对两种部署都成立，所以这里等「任一落点」再分支断言。
    await waitFor(
      () =>
        renderer.root.findAllByProps({ 'data-testid': 'verify-landed' }).length > 0 ||
        renderer.root.findAllByProps({ 'data-testid': 'home-landed' }).length > 0,
    )

    const location = locationOf(renderer)

    if (renderer.root.findAllByProps({ 'data-testid': 'home-landed' }).length > 0) {
      // 免验证：账号已建好，前端不能把用户丢在注册页
      expect(location).toBe('/notebook/n-1')
      return
    }

    expect(location).toContain('/verify-email')
    expect(location).toContain(encodeURIComponent(signupEmail))

    // 后端确实写下了 pending（注册不是前端假成功）。
    const pending = execFileSync(
      'redis-cli',
      ['-h', '127.0.0.1', '-p', '7542', 'GET', `gonotelm:identity:signup:${sha(signupEmail)}`],
      { encoding: 'utf8' },
    ).trim()
    expect(pending.length).toBeGreaterThan(0)
  })
})
