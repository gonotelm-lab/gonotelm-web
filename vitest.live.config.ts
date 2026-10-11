import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * 真机契约测试专用配置：不加载 `src/test/setup.ts`（那里会起 MSW 并拦截真实网络），
 * 只跑 `tests/live/**`，默认指向本机后端。
 *
 *   GNLM_LIVE_AUTH=1 npx vitest run --config vitest.live.config.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/live/**/*.test.{ts,tsx}'],
    testTimeout: 15000,
    env: {
      VITE_API_BASE_URL: process.env.GNLM_API_BASE_URL ?? 'http://127.0.0.1:7099',
    },
  },
})
