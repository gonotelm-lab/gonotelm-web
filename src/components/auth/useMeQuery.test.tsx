import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { mockServer } from '@/test/mocks'
import { createSuccessResponse } from '@/test/mocks/handlers/httpResponse'
import { AuthGate } from './AuthGate'
import { useMeQuery } from './useMeQuery'

function ChildConsumingMe() {
  useMeQuery()
  return <span data-testid="child" />
}

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('useMeQuery dedupe', () => {
  it('gate 与子组件同时订阅时 /user/me 只请求一次', async () => {
    let calls = 0
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/user/me', () => {
        calls += 1
        return createSuccessResponse({ user_id: 'user-1', nickname: '测试用户' })
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let renderer!: ReactTestRenderer
    await act(async () => {
      renderer = create(
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <ChildConsumingMe />
          </AuthGate>
        </QueryClientProvider>,
      )
    })
    await flush()
    await flush()

    expect(renderer.root.findByProps({ 'data-testid': 'child' })).toBeTruthy()
    expect(calls).toBe(1)
  })
})
