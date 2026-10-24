import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { apiErrorMessage } from './apiErrorMessage'

describe('apiErrorMessage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('带业务码的 API 错误使用前端文案，不展示后端 msg', () => {
    expect(
      apiErrorMessage({
        code: 100002,
        status: 200,
        message: 'invalid name',
      }),
    ).toBe('笔记本名称不合法')
  })

  it('按 status 回退同样不给后端 msg 机会', () => {
    expect(
      apiErrorMessage({
        code: 0,
        status: 500,
        message: 'DATABASE_ERROR',
      }),
    ).toBe('服务暂时不可用，请稍后重试')
  })

  it('非 API 错误保留前端自己的说明', () => {
    expect(apiErrorMessage(new Error('工作区尚未就绪'))).toBe('工作区尚未就绪')
  })

  it('未知错误使用调用方给的兜底文案', () => {
    expect(apiErrorMessage(null, 'common:error.requestFailed')).toBe(
      '请求失败，请稍后重试',
    )
  })
})
