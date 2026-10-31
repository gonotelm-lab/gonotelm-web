import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import {
  dismissApiErrorToast,
  resetApiErrorToastForTest,
  showApiErrorToast,
  showAppToast,
} from '@/lib/apiErrorToast'

// Snackbar 的 transition 在 node 环境里会访问 document；沿用仓库里
// GlobalCallbackFailureToast 的做法，用普通容器承接内容。
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    Snackbar: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="snackbar">{children}</div> : null,
  }
})

import { GlobalApiErrorToast } from './GlobalApiErrorToast'

const renderToast = async () => {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(<GlobalApiErrorToast />)
  })
  return renderer
}

const text = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON())

describe('GlobalApiErrorToast', () => {
  beforeEach(async () => {
    resetApiErrorToastForTest()
    await i18n.changeLanguage('zh')
  })

  it('把映射后的前端文案显示出来，不显示后端 msg', async () => {
    const renderer = await renderToast()
    expect(renderer.toJSON()).toBeNull()

    await act(async () => {
      showApiErrorToast({ messageKey: 'apiError.permissionDenied' })
    })

    expect(
      renderer.root.findByProps({ 'data-testid': 'api-error-toast' }),
    ).toBeTruthy()
    expect(text(renderer)).toContain('没有权限执行此操作')
    expect(text(renderer)).not.toContain('PERMISSION_DENIED')
  })

  it('新错误会替换旧提示', async () => {
    const renderer = await renderToast()

    await act(async () => {
      showApiErrorToast({ messageKey: 'apiError.server' })
    })
    await act(async () => {
      showApiErrorToast({ messageKey: 'apiError.network' })
    })

    expect(text(renderer)).toContain('网络连接失败')
    expect(text(renderer)).not.toContain('服务暂时不可用')
  })

  it('5 秒后自动消失', async () => {
    vi.useFakeTimers()
    try {
      const renderer = await renderToast()
      await act(async () => {
        showApiErrorToast({ messageKey: 'apiError.server' })
      })
      expect(
        renderer.root.findByProps({ 'data-testid': 'api-error-toast' }),
      ).toBeTruthy()

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(
        renderer.root.findAllByProps({ 'data-testid': 'api-error-toast' }),
      ).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('可手动关闭', async () => {
    const renderer = await renderToast()
    await act(async () => {
      showApiErrorToast({ messageKey: 'apiError.server' })
    })

    await act(async () => {
      dismissApiErrorToast()
    })

    expect(renderer.toJSON()).toBeNull()
  })

  it('成功提示使用 success 语义，而不是默认 error', async () => {
    const renderer = await renderToast()
    await act(async () => {
      showAppToast({ message: '已加入收藏夹', severity: 'success' })
    })

    expect(
      renderer.root.findByProps({
        'data-testid': 'api-error-toast',
        severity: 'success',
      }),
    ).toBeTruthy()
  })
})
