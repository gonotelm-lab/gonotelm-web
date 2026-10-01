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
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
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
