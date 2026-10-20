import { Children, isValidElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { mockServer } from '@/test/mocks'
import { createNotebookAccessFixture } from '@/test/mocks/fixtures/notebook'
import {
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    // Dialog / Menu 走 Portal，node 测试环境没有 document；用普通容器承接内容。
    Dialog: ({
      open,
      children,
      'data-testid': testId,
    }: {
      open?: boolean
      children?: ReactNode
      'data-testid'?: string
    }) =>
      open ? (
        <div data-testid={testId ?? 'sharing-dialog'}>{children}</div>
      ) : null,
    Menu: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="sharing-visibility-menu">{children}</div> : null,
    MenuItem: ({
      children,
      onClick,
      'data-testid': testId,
    }: {
      children?: ReactNode
      onClick?: () => void
      'data-testid'?: string
    }) => (
      <button type="button" data-testid={testId} onClick={onClick}>
        {children}
      </button>
    ),
    // Avatar 会 new Image() 预加载头像；node 环境没有 Image / window。
    Avatar: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    // 真实 Select 内部直接引用 Menu/Popover，渲染后卸载会访问 window。
    Select: ({
      value,
      onChange,
      children,
      'data-testid': testId,
    }: {
      value?: string
      onChange?: (event: { target: { value: string } }) => void
      children?: ReactNode
      'data-testid'?: string
    }) => {
      const options = Children.toArray(children)
        .filter(isValidElement<{ value?: string; children?: ReactNode }>)
        .map((child) => ({
          value: child.props.value,
          label: child.props.children,
        }))

      return (
        <select
          data-testid={testId}
          value={value}
          onChange={(event) =>
            onChange?.({ target: { value: event.target.value } })
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    },
  }
})

import { NotebookSharingDialog } from './NotebookSharingDialog'

const apiBaseUrl = 'http://127.0.0.1:4173'
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const settle = async () => {
  for (let round = 0; round < 6; round += 1) {
    await act(flush)
  }
}

const renderDialog = async ({
  canManageSharing = true,
}: {
  canManageSharing?: boolean
} = {}) => {
  if (!canManageSharing) {
    mockServer.use(
      http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId/access`, () =>
        createSuccessResponse(
          createNotebookAccessFixture({
            role: 'viewer',
            can_manage_content: false,
            can_manage_notebook: false,
            can_manage_sharing: false,
          }),
        ),
      ),
    )
  }

  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <NotebookSharingDialog
          notebookId="notebook-1"
          notebookName="Rust 入门"
          open
          onClose={onClose}
        />
      </QueryClientProvider>,
    )
  })
  await settle()
  return { renderer, onClose }
}

const findByTestId = (renderer: ReactTestRenderer, testId: string) =>
  renderer.root.findByProps({ 'data-testid': testId })

const findAllByTestId = (renderer: ReactTestRenderer, testId: string) =>
  renderer.root.findAllByProps({ 'data-testid': testId })

describe('NotebookSharingDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('对话框先出现，接口返回前用骨架占位', async () => {
    let releaseAccess: () => void = () => undefined
    const accessGate = new Promise<void>((resolve) => {
      releaseAccess = resolve
    })
    mockServer.use(
      http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId/access`, async () => {
        await accessGate
        return createSuccessResponse(createNotebookAccessFixture())
      }),
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    let renderer!: ReactTestRenderer
    await act(async () => {
      renderer = create(
        <QueryClientProvider client={queryClient}>
          <NotebookSharingDialog
            notebookId="notebook-1"
            notebookName="Rust 入门"
            open
            onClose={vi.fn()}
          />
        </QueryClientProvider>,
      )
    })

    expect(findByTestId(renderer, 'sharing-dialog')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-dialog-skeleton')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-dialog-footer-skeleton')).toBeTruthy()
    expect(findAllByTestId(renderer, 'sharing-add-member-input')).toHaveLength(0)
    expect(findAllByTestId(renderer, 'sharing-save')).toHaveLength(0)

    await act(async () => {
      releaseAccess()
      await flush()
    })
    await settle()

    expect(findAllByTestId(renderer, 'sharing-dialog-skeleton')).toHaveLength(0)
    expect(
      findAllByTestId(renderer, 'sharing-dialog-footer-skeleton'),
    ).toHaveLength(0)
    expect(findByTestId(renderer, 'sharing-add-member-input')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-save')).toBeTruthy()
  })

  it('加载后展示标题、所有者、成员、添加入口与访问权限，保存按钮初始禁用', async () => {
    const { renderer } = await renderDialog()

    expect(findByTestId(renderer, 'sharing-dialog')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-add-member-input')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-member-user-2')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-visibility-trigger')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-save').props.disabled).toBe(true)

    const text = JSON.stringify(renderer.toJSON())
    expect(text).toContain('分享“Rust 入门”')
    expect(text).toContain('拥有访问权限的用户')
    expect(text).toContain('测试用户')
    expect(text).toContain('Alice')
  })

  it('添加用户先在本地展示，点击保存才 PUT 并关闭对话框', async () => {
    let requestedBody: { email?: string; role?: string } = {}
    mockServer.use(
      http.put(
        `${apiBaseUrl}/api/v1/notebooks/:notebookId/sharing/members`,
        async ({ request }) => {
          requestedBody = (await request.json()) as typeof requestedBody
          return createSuccessResponse({
            user_id: 'user-3',
            role: requestedBody.role ?? 'viewer',
          })
        },
      ),
    )

    const { renderer, onClose } = await renderDialog()
    const emailInput = findByTestId(renderer, 'sharing-add-member-input')

    act(() => {
      emailInput.props.onChange({ target: { value: ' bob@example.com ' } })
    })
    act(() => {
      emailInput.props.onKeyDown({
        key: 'Enter',
        preventDefault: () => undefined,
      })
    })
    await settle()

    expect(findByTestId(renderer, 'sharing-member-new:bob@example.com')).toBeTruthy()
    expect(findByTestId(renderer, 'sharing-save').props.disabled).toBe(false)
    expect(requestedBody).toEqual({})
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      findByTestId(renderer, 'sharing-save').props.onClick()
    })
    await settle()

    expect(requestedBody).toEqual({
      email: 'bob@example.com',
      role: 'viewer',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('输入邮箱后不按回车，直接点击保存也会添加该用户', async () => {
    let requestedBody: { email?: string; role?: string } = {}
    mockServer.use(
      http.put(
        `${apiBaseUrl}/api/v1/notebooks/:notebookId/sharing/members`,
        async ({ request }) => {
          requestedBody = (await request.json()) as typeof requestedBody
          return createSuccessResponse({
            user_id: 'user-3',
            role: requestedBody.role ?? 'viewer',
          })
        },
      ),
    )

    const { renderer, onClose } = await renderDialog()
    const emailInput = findByTestId(renderer, 'sharing-add-member-input')

    act(() => {
      emailInput.props.onChange({ target: { value: 'bob@example.com' } })
    })
    await settle()

    expect(findByTestId(renderer, 'sharing-save').props.disabled).toBe(false)

    await act(async () => {
      findByTestId(renderer, 'sharing-save').props.onClick()
    })
    await settle()

    expect(requestedBody).toEqual({
      email: 'bob@example.com',
      role: 'viewer',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('切换为公开后点击保存才 PATCH visibility', async () => {
    let requestedVisibility = ''
    mockServer.use(
      http.patch(
        `${apiBaseUrl}/api/v1/notebooks/:notebookId/visibility`,
        async ({ request }) => {
          const body = (await request.json()) as { visibility?: string }
          requestedVisibility = body.visibility ?? ''
          return createNoContentResponse()
        },
      ),
    )

    const { renderer, onClose } = await renderDialog()

    act(() => {
      findByTestId(renderer, 'sharing-visibility-trigger').props.onClick({
        currentTarget: {},
      })
    })
    await settle()

    act(() => {
      findByTestId(renderer, 'sharing-visibility-option-public').props.onClick()
    })
    await settle()

    expect(requestedVisibility).toBe('')
    expect(findByTestId(renderer, 'sharing-save').props.disabled).toBe(false)

    await act(async () => {
      findByTestId(renderer, 'sharing-save').props.onClick()
    })
    await settle()

    expect(requestedVisibility).toBe('public')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('移除成员后点击保存才 DELETE 对应 user_id', async () => {
    let requestedPath = ''
    mockServer.use(
      http.delete(
        `${apiBaseUrl}/api/v1/notebooks/:notebookId/sharing/members/:userId`,
        ({ request }) => {
          requestedPath = new URL(request.url).pathname
          return createNoContentResponse()
        },
      ),
    )

    const { renderer, onClose } = await renderDialog()

    act(() => {
      findByTestId(renderer, 'sharing-member-remove-user-2').props.onClick()
    })
    await settle()

    expect(
      findAllByTestId(renderer, 'sharing-member-user-2'),
    ).toHaveLength(0)
    expect(requestedPath).toBe('')
    expect(findByTestId(renderer, 'sharing-save').props.disabled).toBe(false)

    await act(async () => {
      findByTestId(renderer, 'sharing-save').props.onClick()
    })
    await settle()

    expect(requestedPath).toBe(
      '/api/v1/notebooks/notebook-1/sharing/members/user-2',
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('无分享管理权限时给出说明，不展示成员列表', async () => {
    const { renderer } = await renderDialog({ canManageSharing: false })

    expect(findAllByTestId(renderer, 'sharing-member-user-2')).toHaveLength(0)
    expect(findAllByTestId(renderer, 'sharing-add-member-input')).toHaveLength(0)
    expect(JSON.stringify(renderer.toJSON())).toContain(
      '只有笔记本所有者可以管理分享。',
    )
  })
})
