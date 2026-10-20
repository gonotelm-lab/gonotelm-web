import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiErrorToastStore,
  dismissApiErrorToast,
  reportApiError,
  resetApiErrorToastForTest,
  showApiErrorToast,
  showAppToast,
} from './apiErrorToast'

describe('apiErrorToastStore', () => {
  beforeEach(() => {
    resetApiErrorToastForTest()
  })

  it('展示前端文案 key，并通知订阅者', () => {
    const listener = vi.fn()
    const unsubscribe = apiErrorToastStore.subscribe(listener)

    const toast = showApiErrorToast({ messageKey: 'apiError.permissionDenied' })

    expect(toast).toEqual(
      expect.objectContaining({ messageKey: 'apiError.permissionDenied' }),
    )
    expect(apiErrorToastStore.getSnapshot()).toEqual(toast)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('短时间内的相同提示只弹一次，不同提示会替换', () => {
    const listener = vi.fn()
    apiErrorToastStore.subscribe(listener)

    const first = showApiErrorToast({ messageKey: 'apiError.server' })
    const duplicate = showApiErrorToast({ messageKey: 'apiError.server' })
    expect(duplicate).toBe(first)
    expect(listener).toHaveBeenCalledTimes(1)

    const next = showApiErrorToast({ messageKey: 'apiError.network' })
    expect(next.id).not.toBe(first.id)
    expect(apiErrorToastStore.getSnapshot()?.messageKey).toBe('apiError.network')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('同一段文案无论来自映射 key 还是现成文本都只弹一次', () => {
    const first = showApiErrorToast({ messageKey: 'apiError.server' })
    const duplicate = showAppToast({ message: '服务暂时不可用，请稍后重试' })

    expect(duplicate).toBe(first)
    expect(apiErrorToastStore.getSnapshot()).toEqual(first)
  })

  it('只允许当前 toast 被自己的计时器关闭', () => {
    const first = showApiErrorToast({ messageKey: 'apiError.server' })
    const second = showApiErrorToast({ messageKey: 'apiError.network' })

    dismissApiErrorToast(first.id)
    expect(apiErrorToastStore.getSnapshot()).toEqual(second)

    dismissApiErrorToast(second.id)
    expect(apiErrorToastStore.getSnapshot()).toBeNull()
  })

  it('后端错误按映射展示，笔记本不存在与未登录保持静默', () => {
    reportApiError({ code: 100002, status: 200 })
    expect(apiErrorToastStore.getSnapshot()?.messageKey).toBe(
      'apiError.notebookNameInvalid',
    )

    resetApiErrorToastForTest()
    reportApiError({ code: 100001, status: 404 })
    expect(apiErrorToastStore.getSnapshot()).toBeNull()

    reportApiError({ code: 2002, status: 401 })
    expect(apiErrorToastStore.getSnapshot()).toBeNull()
  })
})
