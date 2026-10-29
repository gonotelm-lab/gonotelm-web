import { describe, expect, it } from 'vitest'
import {
  describeApiError,
  isNotebookNotFoundError,
} from './apiErrorPresentation'

describe('describeApiError', () => {
  it('业务错误码优先于 HTTP 状态', () => {
    expect(describeApiError({ code: 100002, status: 200 })).toEqual({
      messageKey: 'apiError.notebookNameInvalid',
      silent: false,
    })
  })

  it('分享用户被封禁按业务码提示，不退化成 403 通用无权限', () => {
    expect(describeApiError({ code: 100011, status: 403 })).toEqual({
      messageKey: 'apiError.shareUserBanned',
      silent: false,
    })
  })

  it('置顶数量达上限按业务码提示', () => {
    expect(describeApiError({ code: 107001, status: 200 })).toEqual({
      messageKey: 'apiError.pinLimit',
      silent: false,
    })
  })

  it('笔记本不存在静默交给专用页面处理', () => {
    expect(describeApiError({ code: 100001, status: 404 })).toEqual({
      messageKey: 'apiError.notebookNotFound',
      silent: true,
    })
  })

  it('未登录由跳转处理，不再重复 toast', () => {
    expect(describeApiError({ code: 2002, status: 401 })).toEqual({
      messageKey: 'apiError.sessionExpired',
      silent: true,
    })
  })

  it('CSRF 重试后仍失败要提示刷新页面', () => {
    expect(describeApiError({ code: 2003, status: 403 })).toEqual({
      messageKey: 'apiError.securityCheck',
      silent: false,
    })
  })

  it('没有业务码时按 HTTP 状态回退', () => {
    expect(describeApiError({ code: 0, status: 403 })).toEqual({
      messageKey: 'apiError.permissionDenied',
      silent: false,
    })
    expect(describeApiError({ code: 0, status: 500 })).toEqual({
      messageKey: 'apiError.server',
      silent: false,
    })
    expect(describeApiError({ code: 0, status: 429 })).toEqual({
      messageKey: 'apiError.tooManyRequests',
      silent: false,
    })
  })

  it('网络失败使用网络文案', () => {
    expect(describeApiError({ code: -1, status: 0 })).toEqual({
      messageKey: 'apiError.network',
      silent: false,
    })
  })

  it('未知业务码不泄露后端原文，退回通用文案', () => {
    expect(describeApiError({ code: 987654, status: 200 })).toEqual({
      messageKey: 'apiError.requestFailed',
      silent: false,
    })
  })
})

describe('isNotebookNotFoundError', () => {
  it('只认 100001', () => {
    expect(isNotebookNotFoundError({ code: 100001 })).toBe(true)
    expect(isNotebookNotFoundError({ code: 100002 })).toBe(false)
    expect(isNotebookNotFoundError(null)).toBe(false)
    expect(isNotebookNotFoundError(new Error('not found'))).toBe(false)
  })
})
