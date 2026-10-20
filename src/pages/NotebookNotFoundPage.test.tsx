import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { NotebookNotFoundPage } from './NotebookNotFoundPage'

const renderPage = async (props?: {
  isRetrying?: boolean
  onRetry?: () => void
}) => {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <MemoryRouter>
        <NotebookNotFoundPage {...props} />
      </MemoryRouter>,
    )
  })
  return renderer
}

const text = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON())

describe('NotebookNotFoundPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('展示专用说明与返回首页入口', async () => {
    const renderer = await renderPage()

    expect(
      renderer.root.findByProps({ 'data-testid': 'notebook-not-found' }),
    ).toBeTruthy()
    expect(text(renderer)).toContain('找不到这个笔记本')
    expect(text(renderer)).toContain('可能已被删除')
    expect(text(renderer)).toContain('返回首页')
  })

  it('点击重试会触发重新请求', async () => {
    const onRetry = vi.fn()
    const renderer = await renderPage({ onRetry })

    act(() => {
      renderer.root
        .findByProps({ 'data-testid': 'notebook-not-found-retry' })
        .props.onClick()
    })

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('重试中禁用按钮并显示进度文案', async () => {
    const renderer = await renderPage({ isRetrying: true, onRetry: vi.fn() })

    expect(
      renderer.root.findByProps({ 'data-testid': 'notebook-not-found-retry' })
        .props.disabled,
    ).toBe(true)
    expect(text(renderer)).toContain('重试中')
  })
})
