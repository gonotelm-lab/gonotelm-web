import i18n from '@/i18n'
import { describeApiError } from './apiErrorPresentation'

interface CodedError {
  code?: unknown
  status?: unknown
}

/**
 * 页面内联错误文案。
 *
 * API 错误一律走同一套前端映射；只有非 API 的 `Error`（例如本地状态校验）
 * 才允许展示它自己的 message，避免后端英文 `msg` 漏到界面上。
 */
export function apiErrorMessage(
  error: unknown,
  fallbackKey = 'apiError.requestFailed',
): string {
  if (typeof error === 'object' && error !== null) {
    const coded = error as CodedError
    if (typeof coded.code === 'number') {
      return i18n.t(
        describeApiError({
          code: coded.code,
          status: typeof coded.status === 'number' ? coded.status : 200,
        }).messageKey,
      )
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return i18n.t(fallbackKey)
}
