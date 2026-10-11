import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { rememberAuthAttempt } from '@/lib/auth'
import { AuthErrorPage } from './AuthErrorPage'

/** node 测试环境没有 sessionStorage：给一个最小实现，用来验证「回到原处」。 */
function installSessionStorage() {
  const store = new Map<string, string>()
  return {
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

const text = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON())
const backTo = (renderer: ReactTestRenderer) => {
  const back = renderer.root.findByProps({ 'data-testid': 'auth-error-back' })
  return back.props.href ?? back.props.to
}

describe('AuthErrorPage（绑定失败落地页）', () => {
  beforeEach(() => {
    ;(globalThis as { window?: unknown }).window = {
      sessionStorage: installSessionStorage().storage,
      location: { origin: 'http://127.0.0.1:5173' },
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('已绑定到其它账号：说清原因并带上 provider 名字', async () => {
    const renderer = await renderPage(
      '/auth/error?reason=identity-already-linked&provider=github',
    )

    expect(text(renderer)).toContain('绑定未完成')
    expect(text(renderer)).toContain('GitHub')
    expect(text(renderer)).toContain('已绑定其它账号')
  })

  it('同 provider 已绑定过：给专门的文案', async () => {
    const renderer = await renderPage(
      '/auth/error?reason=provider-already-bound&provider=google',
    )

    expect(text(renderer)).toContain('已绑定同类型的三方账号')
  })

  it('state 过期：绑定语义（回到设置重新发起），而不是登录语义', async () => {
    const renderer = await renderPage('/auth/error?reason=oauth-state-not-found&provider=github')

    expect(text(renderer)).toContain('绑定会话已过期')
    expect(text(renderer)).not.toContain('重新发起登录')
  })

  it('IdP 侧失败：绑定语义的「授权未完成」', async () => {
    const renderer = await renderPage('/auth/error?reason=idp-error&provider=github')

    expect(text(renderer)).toContain('授权未完成')
    expect(text(renderer)).toContain('重新发起绑定')
  })

  it('触发限流：有专门文案', async () => {
    const renderer = await renderPage('/auth/error?reason=too-many-requests&provider=github')

    expect(text(renderer)).toContain('尝试过于频繁')
  })

  it('后端新增的未知 reason 退回通用文案，并把原值展示出来便于排查', async () => {
    const renderer = await renderPage('/auth/error?reason=brand-new-thing&provider=github')

    expect(text(renderer)).toContain('三方账号绑定失败')
    expect(renderer.root.findByProps({ 'data-testid': 'auth-error-reason' })).toBeTruthy()
    expect(text(renderer)).toContain('brand-new-thing')
  })

  it('没有 reason 也能渲染（不炸、不显示原因行）', async () => {
    const renderer = await renderPage('/auth/error')

    expect(text(renderer)).toContain('绑定未完成')
    expect(renderer.root.findAllByProps({ 'data-testid': 'auth-error-reason' })).toHaveLength(0)
  })

  it('「返回设置」回到记住的位置，并把原因带进对话框就地显示', async () => {
    rememberAuthAttempt('/notebook/n-1?settings=account', 'bind')

    const renderer = await renderPage('/auth/error?reason=identity-already-linked&provider=github')

    expect(backTo(renderer)).toBe(
      '/notebook/n-1?settings=account&reason=identity-already-linked&provider=github',
    )
  })

  it('记住的位置不是设置页时不硬塞参数', async () => {
    rememberAuthAttempt('/notebook/n-1', 'bind')

    const renderer = await renderPage('/auth/error?reason=identity-already-linked&provider=github')

    expect(backTo(renderer)).toBe('/notebook/n-1')
  })

  it('没记住任何位置时「返回设置」退回站点根', async () => {
    const renderer = await renderPage('/auth/error?reason=identity-already-linked')

    expect(backTo(renderer)).toBe('/')
  })
})
