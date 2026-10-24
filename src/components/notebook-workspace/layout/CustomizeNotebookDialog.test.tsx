import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Alert } from '@mui/material'
import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { mockServer } from '@/test/mocks'
import type { Notebook } from '@/types/api'
import {
  createNotebookFixture,
  createNotebookSummaryFixture,
} from '@/test/mocks/fixtures/notebook'
import { createErrorResponse, createSuccessResponse } from '@/test/mocks/handlers/httpResponse'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    // Dialog 走 Portal，node 测试环境没有 document；用普通容器承接内容。
    Dialog: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="customize-notebook-dialog">{children}</div> : null,
    // 只断言受控 value/onChange；描边、helperText 等样式不参与断言。
    TextField: ({
      'data-testid': testId,
      value,
      onChange,
    }: {
      'data-testid'?: string
      value?: string
      onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
    }) => (
      <input
        data-testid={testId}
        value={value ?? ''}
        onChange={(event) => onChange?.(event)}
      />
    ),
  }
})

import { CustomizeNotebookDialog } from './CustomizeNotebookDialog'

const apiBaseUrl = 'http://127.0.0.1:4173'
const nameInputTestId = 'customize-notebook-name-input'
const descInputTestId = 'customize-notebook-description-input'
const switchTestId = 'customize-notebook-description-switch'
const doneTestId = 'customize-notebook-done'
const homeKey = ['notebooks', 'home', { sortBy: 'updated_at', scope: 'owned' }] as const

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const settle = async () => {
  for (let round = 0; round < 6; round += 1) {
    await act(flush)
  }
}

const findByTestId = (renderer: ReactTestRenderer, testId: string) =>
  renderer.root.findByProps({ 'data-testid': testId })

const countByTestId = (renderer: ReactTestRenderer, testId: string) =>
  renderer.root.findAllByProps({ 'data-testid': testId }).length

const findAlertChildren = (renderer: ReactTestRenderer) => {
  const alert = renderer.root.findByType(Alert)
  return Array.isArray(alert.props.children) ? '' : (alert.props.children as string)
}

interface RenderOptions {
  notebookName?: string
  description?: string
  customizeDescription?: boolean
}

const renderDialog = async ({
  notebookName = 'Rust 入门',
  description = '',
  customizeDescription = false,
}: RenderOptions = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(
    ['notebook', 'notebook-1'],
    createNotebookFixture({
      desc: customizeDescription ? description : '',
      flags: { customize_description: customizeDescription },
    }),
  )
  queryClient.setQueryData(homeKey, {
    notebooks: [createNotebookSummaryFixture()],
    limit: 50,
    offset: 0,
    has_more: false,
  })

  const onSaved = vi.fn()
  const onClose = vi.fn()
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <CustomizeNotebookDialog
          notebookId="notebook-1"
          open
          notebookName={notebookName}
          description={description}
          customizeDescription={customizeDescription}
          onClose={onClose}
          onSaved={onSaved}
        />
      </QueryClientProvider>,
    )
  })
  await settle()
  return { renderer, queryClient, onSaved, onClose }
}

const typeInto = async (renderer: ReactTestRenderer, testId: string, value: string) => {
  await act(async () => {
    findByTestId(renderer, testId).props.onChange({ target: { value } })
  })
  await settle()
}

const setCustomizeToggle = async (renderer: ReactTestRenderer, checked: boolean) => {
  await act(async () => {
    findByTestId(renderer, switchTestId).props.onChange({}, checked)
  })
  await settle()
}

const clickDone = async (renderer: ReactTestRenderer) => {
  await act(async () => {
    findByTestId(renderer, doneTestId).props.onClick()
  })
  await settle()
}

describe('CustomizeNotebookDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('打开时预填当前名称；未开启自定义时没有摘要输入', async () => {
    const { renderer, onClose } = await renderDialog({
      notebookName: 'Rust 入门',
      customizeDescription: false,
    })

    expect(findByTestId(renderer, nameInputTestId).props.value).toBe('Rust 入门')
    expect(countByTestId(renderer, descInputTestId)).toBe(0)
    expect(findByTestId(renderer, switchTestId).props.checked).toBe(false)

    // 开着对话框但没点完成，不该关闭
    expect(onClose).not.toHaveBeenCalled()
  })

  it('开关打开后出现摘要输入（并复用已保存摘要做草稿）', async () => {
    const { renderer } = await renderDialog({
      notebookName: 'Rust 入门',
      description: '已保存的自定义摘要',
      customizeDescription: false,
    })

    await setCustomizeToggle(renderer, true)

    const descInput = findByTestId(renderer, descInputTestId)
    expect(descInput.props.value).toBe('已保存的自定义摘要')
  })

  it('开启自定义但摘要为空时点完成：报校验错误且不发请求、不关闭', async () => {
    let patches = 0
    mockServer.use(
      http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async () => {
        patches += 1
        return createSuccessResponse(null)
      }),
    )

    const { renderer, onSaved, onClose, queryClient } = await renderDialog()

    await setCustomizeToggle(renderer, true)
    await clickDone(renderer)

    expect(findAlertChildren(renderer)).toBe(
      i18n.t('workspace:customizeNotebook.description.error.invalid'),
    )
    expect(patches).toBe(0)
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(
      (queryClient.getQueryData<Notebook>(['notebook', 'notebook-1']) as Notebook).flags
        .customize_description,
    ).toBe(false)
  })

  it('改名 + 开启自定义摘要后点完成：PATCH 最小负载并同步两处缓存、关闭对话框', async () => {
    let requestedBody: Record<string, unknown> = {}
    mockServer.use(
      http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async ({ request }) => {
        requestedBody = (await request.json()) as typeof requestedBody
        return createSuccessResponse(null)
      }),
    )

    const { renderer, queryClient, onSaved, onClose } = await renderDialog()

    await setCustomizeToggle(renderer, true)
    await typeInto(renderer, descInputTestId, 'FFI 与 unsafe 的实践要点')
    await typeInto(renderer, nameInputTestId, 'Rust FFI 实践')
    await clickDone(renderer)

    expect(requestedBody).toEqual({
      name: 'Rust FFI 实践',
      desc: 'FFI 与 unsafe 的实践要点',
      customize_description: true,
    })

    const cached = queryClient.getQueryData<Notebook>(['notebook', 'notebook-1'])
    expect(cached?.name).toBe('Rust FFI 实践')
    expect(cached?.desc).toBe('FFI 与 unsafe 的实践要点')
    expect(cached?.flags.customize_description).toBe(true)
    // 首页列表与详情缓存分离：改名/自定义后列表必须失效，回首页时拿到新数据。
    expect(Boolean(queryClient.getQueryState(homeKey)?.isInvalidated)).toBe(true)

    expect(onSaved).toHaveBeenCalledWith({
      name: 'Rust FFI 实践',
      desc: 'FFI 与 unsafe 的实践要点',
      customizeDescription: true,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('开启状态下点掉开关：PATCH 只带 customize_description=false，缓存 desc 清空', async () => {
    let requestedBody: Record<string, unknown> = {}
    mockServer.use(
      http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async ({ request }) => {
        requestedBody = (await request.json()) as typeof requestedBody
        return createSuccessResponse(null)
      }),
    )

    const { renderer, queryClient, onSaved } = await renderDialog({
      description: '已保存的自定义摘要',
      customizeDescription: true,
    })

    await setCustomizeToggle(renderer, false)
    await clickDone(renderer)

    expect(requestedBody).toEqual({ customize_description: false })

    const cached = queryClient.getQueryData<Notebook>(['notebook', 'notebook-1'])
    expect(cached?.desc).toBe('')
    expect(cached?.flags.customize_description).toBe(false)
    expect(onSaved).toHaveBeenCalledWith({
      name: 'Rust 入门',
      desc: '',
      customizeDescription: false,
    })
  })

  it('没有任何改动时点完成：直接关闭不发请求', async () => {
    let patches = 0
    mockServer.use(
      http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async () => {
        patches += 1
        return createSuccessResponse(null)
      }),
    )

    const { renderer, onClose } = await renderDialog({
      notebookName: 'Rust 入门',
      description: '已保存的自定义摘要',
      customizeDescription: true,
    })

    await clickDone(renderer)

    expect(patches).toBe(0)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('名称为空时点完成：报必填错误且不发请求', async () => {
    let patches = 0
    mockServer.use(
      http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async () => {
        patches += 1
        return createSuccessResponse(null)
      }),
    )

    const { renderer, onClose } = await renderDialog()

    await typeInto(renderer, nameInputTestId, '   ')
    await clickDone(renderer)

    expect(findAlertChildren(renderer)).toBe(
      i18n.t('workspace:customizeNotebook.name.errorRequired'),
    )
    expect(patches).toBe(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each([
    [
      100002,
      'workspace:customizeNotebook.name.errorInvalid',
    ],
    [
      100003,
      'workspace:customizeNotebook.description.error.invalid',
    ],
    [
      999999,
      'workspace:customizeNotebook.error.saveFailed',
    ],
  ])('保存失败（错误码 %i）时映射到对应文案并保持对话框开着', async (code, messageKey) => {
    mockServer.use(
      http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, () =>
        createErrorResponse(400, 'mock save error', code),
      ),
    )

    const { renderer, onClose } = await renderDialog()

    await typeInto(renderer, nameInputTestId, 'Rust FFI 实践')
    await clickDone(renderer)

    expect(findAlertChildren(renderer)).toBe(i18n.t(messageKey))
    // 保存失败不能把对话框关掉，用户要有机会修改后重试。
    expect(onClose).not.toHaveBeenCalled()
  })
})
