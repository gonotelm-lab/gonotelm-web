import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorBoundary } from './RouteErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

const renderThrowing = async () => {
  const router = createMemoryRouter([
    { path: '/', element: <Boom />, errorElement: <RouteErrorBoundary /> },
  ])
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(<RouterProvider router={router} />)
  })
  return renderer
}

describe('RouteErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('页面抛错时给可恢复的界面，而不是白屏', async () => {
    // React 会把未捕获的渲染错误打到 console.error，这里静音以免污染测试输出。
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const renderer = await renderThrowing()

    renderer.root.findByProps({ 'data-testid': 'route-error' })
    renderer.root.findByProps({ 'data-testid': 'route-error-reload' })
    const text = JSON.stringify(renderer.toJSON())
    expect(text).toContain('页面出错了')
    // 不把内部错误信息铺到界面上
    expect(text).not.toContain('boom')
  })
})
