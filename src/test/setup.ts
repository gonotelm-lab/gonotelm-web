import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { mockServer, resetMockScenarios } from './mocks'

vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:4173')

beforeAll(() => {
  mockServer.listen({
    onUnhandledRequest(request, print) {
      print.error()
      throw new Error(
        `未声明的测试网络请求：${request.method} ${request.url}. 新增测试默认禁止真实网络访问。`,
      )
    },
  })
})

afterEach(() => {
  mockServer.resetHandlers()
  resetMockScenarios()
})

afterAll(() => {
  mockServer.close()
})
