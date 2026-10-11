import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { rememberAuthReturn } from '@/lib/auth'
import { AuthErrorPage } from './AuthErrorPage'

/** node 测试环境没有 sessionStorage：给一个最小实现，用来验证「回到原处」的兜底。 */
function installSessionStorage() {
  const store = new Map<string, string>()
  return {
    store,
    storage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  }
}

const renderPage = async (entry: string) => {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/auth/error" element={<AuthErrorPage />} />
        </Routes>
      </MemoryRouter>,
    )
  })
  return renderer
}

describe('AuthErrorPage', () => {
  let session: ReturnType<typeof installSessionStorage>

  beforeEach(() => {
    session = installSessionStorage()
    // 只补 sessionStorage，window.location.origin 仍由 absoluteReturnTo 的守卫处理。
    ;(globalThis as { window?: unknown }).window = {
      sessionStorage: session.storage,
      location: { origin: 'http://127.0.0.1:5173' },
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('后端带不了 return_to 时，用跳 IdP 前记住的位置回到原处', async () => {
    rememberAuthReturn('/notebook/n-1?settings=security')

    const renderer = await renderPage('/auth/error?error=106019&mode=bind')

    const back = renderer.root.findByProps({ 'data-testid': 'auth-error-back' })
    expect(back.props.href ?? back.props.to).toBe('/notebook/n-1?settings=security')
  })

  it('后端给了 return_to 时优先用它，忽略记住的位置', async () => {
    rememberAuthReturn('/notebook/old')

    const renderer = await renderPage('/auth/error?error=106019&mode=bind&return_to=%2Fnotebook%2Fn-2')

    const back = renderer.root.findByProps({ 'data-testid': 'auth-error-back' })
    expect(back.props.href ?? back.props.to).toBe('/notebook/n-2')
  })

  it('没记住任何位置时退回站点根', async () => {
    const renderer = await renderPage('/auth/error?error=106019&mode=bind')

    const back = renderer.root.findByProps({ 'data-testid': 'auth-error-back' })
    expect(back.props.href ?? back.props.to).toBe('/')
  })

  it('登录流程的封禁码：说清原因并给出「重新登录」出口', async () => {
    const renderer = await renderPage('/auth/error?error=106008&mode=login&return_to=%2Fnotebook%2Fn-1')

    expect(JSON.stringify(renderer.toJSON())).toContain('登录未完成')
    expect(JSON.stringify(renderer.toJSON())).toContain('该账号已被封禁')
    // 登录失败才有「重新登录」，并把 return_to 带回去。
    const retry = renderer.root.findByProps({ 'data-testid': 'auth-error-retry-login' })
    expect(String(retry.props.href ?? retry.props.to)).toContain('/login?return_to=')
    expect(JSON.stringify(renderer.toJSON())).toContain('106008')
  })

  it('绑定流程的已绑定码：按绑定语义给文案，且不出现「重新登录」', async () => {
    const renderer = await renderPage('/auth/error?error=106019&mode=bind')

    expect(JSON.stringify(renderer.toJSON())).toContain('绑定未完成')
    expect(JSON.stringify(renderer.toJSON())).toContain('已经绑定到其它账号')
    expect(renderer.root.findAllByProps({ 'data-testid': 'auth-error-retry-login' })).toHaveLength(0)
  })

  it('后端只传 error 不传 mode 时，按绑定专属码推断为绑定', async () => {
    const renderer = await renderPage('/auth/error?error=106023')

    expect(JSON.stringify(renderer.toJSON())).toContain('绑定未完成')
    expect(JSON.stringify(renderer.toJSON())).toContain('已经绑定过同类型')
  })

  it('state 过期码：登录与绑定给不同的补救说法', async () => {
    const login = await renderPage('/auth/error?error=106003&mode=login')
    expect(JSON.stringify(login.toJSON())).toContain('重新发起登录')

    const bind = await renderPage('/auth/error?error=106003&mode=bind')
    expect(JSON.stringify(bind.toJSON())).toContain('回到设置里重新发起')
  })

  it('未知码退回通用文案，仍展示错误码便于排查', async () => {
    const renderer = await renderPage('/auth/error?error=999999&mode=login')

    expect(JSON.stringify(renderer.toJSON())).toContain('第三方登录失败')
    expect(JSON.stringify(renderer.toJSON())).toContain('999999')
  })

  it('没有 error 参数也能渲染（不炸、不给错误码）', async () => {
    const renderer = await renderPage('/auth/error')

    expect(JSON.stringify(renderer.toJSON())).toContain('登录未完成')
    expect(renderer.root.findAllByProps({ 'data-testid': 'auth-error-code' })).toHaveLength(0)
  })

  it('return_to 非法时「返回」落到站点根，不会被带出去', async () => {
    const renderer = await renderPage('/auth/error?error=106019&mode=bind&return_to=https%3A%2F%2Fevil.com')

    const back = renderer.root.findByProps({ 'data-testid': 'auth-error-back' })
    expect(back.props.href ?? back.props.to).toBe('/')
  })

  it('return_to 合法时「返回」回到原页面', async () => {
    const renderer = await renderPage('/auth/error?error=106019&mode=bind&return_to=%2Fnotebook%2Fn-1')

    const back = renderer.root.findByProps({ 'data-testid': 'auth-error-back' })
    expect(back.props.href ?? back.props.to).toBe('/notebook/n-1')
  })
})
