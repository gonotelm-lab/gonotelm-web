/**
 * 后端错误码 → 前端文案 key。
 *
 * 这里刻意不读后端 `msg`：同一类错误在不同接口里可能写成不同英文句子，
 * 直接展示既不稳定也不适合最终用户。文案只在前端维护。
 */

/** 笔记本不存在/无权访问。笔记本页面会据此渲染专用页面，不再弹 toast。 */
export const NOTEBOOK_NOT_FOUND_CODE = 100001

const NOT_LOGIN_CODE = 2002
const CSRF_CODE = 2003

export interface ApiErrorFacts {
  code: number
  status: number
}

export interface ApiErrorPresentation {
  /** `common` 命名空间下的 i18n key。 */
  messageKey: string
  /** 已有专门处理（跳登录、专用页面）时不再弹 toast。 */
  silent: boolean
}

const byCode: Record<number, string> = {
  // 内部错误
  [-1]: 'apiError.server',
  [-2]: 'apiError.server',
  [-3]: 'apiError.server',
  [-4]: 'apiError.server',
  [-5]: 'apiError.server',
  [-998]: 'apiError.server',
  [-999]: 'apiError.server',

  // 通用业务错误
  1000: 'apiError.badRequest',
  1001: 'apiError.notFound',
  1002: 'apiError.aiUnavailable',
  1003: 'apiError.aiUnavailable',
  1004: 'apiError.busy',
  1005: 'apiError.busy',

  // 笔记本
  100002: 'apiError.notebookNameInvalid',
  100003: 'apiError.notebookDescInvalid',
  100004: 'apiError.badRequest',
  100005: 'apiError.sourceLimit',
  100006: 'apiError.noSourcesForDescription',
  100007: 'apiError.memberRoleInvalid',
  100008: 'apiError.cannotShareOwner',
  100009: 'apiError.memberNotFound',
  100010: 'apiError.shareUserNotFound',
  100011: 'apiError.shareUserBanned',
  100012: 'apiError.notebookIdInvalid',
  100013: 'apiError.badRequest',
  100014: 'apiError.visibilityInvalid',

  // 对话
  101001: 'apiError.chatNotFound',
  101002: 'apiError.messageNotFound',
  101003: 'apiError.taskExpired',
  101004: 'apiError.suggestionGenerating',

  // Studio 产物
  102001: 'apiError.artifactNotFound',
  102002: 'apiError.permissionDenied',
  102003: 'apiError.operationNotAllowed',
  102004: 'apiError.operationNotAllowed',
  102005: 'apiError.operationNotAllowed',
  102006: 'apiError.operationNotAllowed',
  102007: 'apiError.operationNotAllowed',
  102008: 'apiError.operationNotAllowed',
  102009: 'apiError.badRequest',
  102010: 'apiError.badRequest',
  102011: 'apiError.operationNotAllowed',
  102012: 'apiError.operationNotAllowed',
  102013: 'apiError.operationNotAllowed',
  102014: 'apiError.notFound',

  // 来源
  103001: 'apiError.sourceNotFound',
  103002: 'apiError.sourceTooLarge',
  103003: 'apiError.sourceUnsupported',
  103004: 'apiError.sourceUrlInvalid',
  103005: 'apiError.sourceCorrupted',

  // 任务与运行环境
  104001: 'apiError.taskExpired',
  105001: 'apiError.sandboxExpired',

  // 置顶
  107001: 'apiError.pinLimit',

  // 收藏夹
  108001: 'apiError.favouriteLimit',
  108002: 'apiError.favouriteNotebookLimit',
  108003: 'apiError.favouriteNotFound',
  108004: 'apiError.favouriteNameInvalid',

  // 账号与登录
  106001: 'apiError.unsupportedLoginMethod',
  106002: 'apiError.loginServiceUnavailable',
  106003: 'apiError.authStateExpired',
  106004: 'apiError.authStateExpired',
  106005: 'apiError.loginServiceUnavailable',
  106006: 'apiError.accountNotFound',
  106007: 'apiError.sessionExpired',
  106008: 'apiError.accountBanned',
  106009: 'apiError.nicknameInvalid',
  106010: 'apiError.avatarInvalid',
  106011: 'apiError.invalidCredentials',
  106012: 'apiError.emailTaken',
  106013: 'apiError.emailInvalid',
  106014: 'apiError.weakPassword',
  106015: 'apiError.emailUnavailable',
  106016: 'apiError.verificationExpired',
  106017: 'apiError.verificationAttempts',
  106018: 'apiError.verificationMismatch',
  106019: 'apiError.identityAlreadyLinked',
  106020: 'apiError.emailNotVerified',
  106021: 'apiError.tooManyRequests',
  106022: 'apiError.identityNotFound',
  106023: 'apiError.providerAlreadyBound',
  106024: 'apiError.lastLoginMethod',
  106025: 'apiError.passwordUnchanged',
  106026: 'apiError.mailFailed',
}

const byStatus = (status: number): string => {
  if (status === 0) return 'apiError.network'
  if (status === 400 || status === 422) return 'apiError.badRequest'
  if (status === 401) return 'apiError.sessionExpired'
  if (status === 403) return 'apiError.permissionDenied'
  if (status === 404) return 'apiError.notFound'
  if (status === 409) return 'apiError.conflict'
  if (status === 413) return 'apiError.payloadTooLarge'
  if (status === 429) return 'apiError.tooManyRequests'
  if (status >= 500) return 'apiError.server'
  return 'apiError.requestFailed'
}

export function describeApiError(error: ApiErrorFacts): ApiErrorPresentation {
  if (error.status === 0) {
    return { messageKey: 'apiError.network', silent: false }
  }
  if (error.code === NOTEBOOK_NOT_FOUND_CODE) {
    return { messageKey: 'apiError.notebookNotFound', silent: true }
  }
  if (error.code === NOT_LOGIN_CODE) {
    return { messageKey: 'apiError.sessionExpired', silent: true }
  }
  if (error.code === CSRF_CODE) {
    return { messageKey: 'apiError.securityCheck', silent: false }
  }

  const messageKey = byCode[error.code]
  if (messageKey) {
    return { messageKey, silent: false }
  }

  return { messageKey: byStatus(error.status), silent: false }
}

export function isNotebookNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === NOTEBOOK_NOT_FOUND_CODE
  )
}
