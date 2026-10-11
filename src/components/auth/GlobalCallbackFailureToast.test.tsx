import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Snackbar 的 useSnackbar 在 effect 里直接访问 document；node 测试环境没有。
// 按本仓库惯例（SettingsDialog.test 对 Dialog 同样处理）用普通容器承接内容，
// 断言仍落在真实的消息文本上。
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    Snackbar: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="snackbar">{children}</div> : null,
  }
})

import { GlobalCallbackFailureToast } from './GlobalCallbackFailureToast'

const renderAt = async (entry: string) => {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <MemoryRouter initialEntries={[entry]}>
        <GlobalCallbackFailureToast />
      </MemoryRouter>,
    )
  })
  return renderer
}

const text = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON())

describe('GlobalCallbackFailureToast', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('登录失败落地（/login?reason=）→ 登录语义的可读文案', async () => {
    const renderer = await renderAt('/login?reason=login-state-not-found&provider=github')

    renderer.root.findByProps({ 'data-testid': 'callback-failure-toast' })
    expect(text(renderer)).toContain('这次登录已经过期')
    // 不再把 kebab 串直接甩给用户
    expect(text(renderer)).not.toContain('login-state-not-found')
  })

  it('绑定失败落地（?settings=account&reason=）→ 绑定语义的可读文案', async () => {
    const renderer = await renderAt(
      '/notebook/n-1?settings=account&reason=identity-already-linked&provider=github',
    )

    expect(text(renderer)).toContain('GitHub')
    expect(text(renderer)).toContain('已经绑定到其它账号')
    expect(text(renderer)).not.toContain('identity-already-linked')
  })

  it('文案里带上 provider 的可读名字', async () => {
    const renderer = await renderAt('/login?reason=idp-access-denied&provider=google')

    expect(text(renderer)).toContain('Google')
    expect(text(renderer)).toContain('取消了')
  })

  it('每个已登记的 reason 都有专属文案，不会退化成通用提示', async () => {
    const cases: Array<[string, string]> = [
      ['provider-not-found', '不支持这种第三方登录方式'],
      ['idp-error', '授权没有完成'],
      ['idp-exchange-error', '授权没有完成'],
      ['user-banned', '该账号已被封禁'],
      ['idp-email-unavailable', '没有提供已验证的邮箱'],
      ['email-not-verified', '先验证账号邮箱'],
      ['identity-not-found', '不存在'],
      ['provider-already-bound', '已经绑定过同类型'],
      ['user-not-found', '账号状态异常'],
      ['user-session-not-found', '账号状态异常'],
    ]

    for (const [reason, expected] of cases) {
      const renderer = await renderAt(
        `/notebook/n-1?settings=account&reason=${reason}&provider=github`,
      )
      expect(text(renderer), reason).toContain(expected)
    }
  })

  it('未登记的 reason 退回通用文案，但不会漏掉提示', async () => {
    const renderer = await renderAt('/login?reason=brand-new-thing&provider=github')

    renderer.root.findByProps({ 'data-testid': 'callback-failure-toast' })
    expect(text(renderer)).toContain('第三方登录失败')
  })

  it('/auth/error 自己就是错误落地页，不再重复弹 toast', async () => {
    const renderer = await renderAt('/auth/error?reason=identity-already-linked&provider=github')

    expect(
      renderer.root.findAllByProps({ 'data-testid': 'callback-failure-toast' }),
    ).toHaveLength(0)
  })

  it('没有 reason 时不弹', async () => {
    const renderer = await renderAt('/login?return_to=%2Fnotebook%2Fn-1')

    expect(renderer.toJSON()).toBeNull()
  })
})
