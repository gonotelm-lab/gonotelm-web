import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetApiErrorToastForTest,
  showApiErrorToast,
} from '@/lib/apiErrorToast'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    Snackbar: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="snackbar">{children}</div> : null,
  }
})

import { AppRoot } from './AppRoot'

const renderRoot = async () => {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppRoot />}>
            <Route path="/" element={<div data-testid="page">page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  })
  return renderer
}

describe('AppRoot', () => {
  beforeEach(() => {
    resetApiErrorToastForTest()
  })

  it('全局 API 错误 toast 挂在根布局上', async () => {
    const renderer = await renderRoot()
    expect(
      renderer.root.findByProps({ 'data-testid': 'page' }),
    ).toBeTruthy()

    await act(async () => {
      showApiErrorToast({ messageKey: 'apiError.server' })
    })

    expect(
      renderer.root.findByProps({ 'data-testid': 'api-error-toast' }),
    ).toBeTruthy()
  })
})
