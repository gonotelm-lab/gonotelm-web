import i18n from '@/i18n'
import {
  describeApiError,
  type ApiErrorFacts,
} from './apiErrorPresentation'

export interface AppToast {
  id: number
  /** 业务代码已经翻译好的现成文案；与 `messageKey` 二选一。 */
  message?: string
  /** `common` 命名空间下的 i18n key；优先用映射避免后端原文漏出。 */
  messageKey?: string
  values?: Record<string, string | number>
}

type Listener = () => void

const duplicateWindowMs = 1500

let current: AppToast | null = null
let nextId = 0
let lastSignature = ''
let lastShownAt = 0
const listeners = new Set<Listener>()

const emit = () => {
  listeners.forEach((listener) => listener())
}

const renderedTextOf = (toast: Omit<AppToast, 'id'>) => {
  if (toast.message) {
    return toast.message
  }
  if (toast.messageKey) {
    return i18n.t(toast.messageKey, toast.values ?? {})
  }
  return ''
}

/**
 * 同一段最终文案只保留一个 toast。这样请求层已经提示过的错误，
 * 页面即使又把自己翻译好的同一句话交给 toast，也不会叠两层。
 */
const signatureOf = (toast: Omit<AppToast, 'id'>) =>
  String(renderedTextOf(toast))

export function showAppToast(
  toast: Omit<AppToast, 'id'>,
): AppToast {
  const signature = signatureOf(toast)
  const now = Date.now()
  if (current && signature === lastSignature && now - lastShownAt < duplicateWindowMs) {
    return current
  }

  nextId += 1
  current = { ...toast, id: nextId }
  lastSignature = signature
  lastShownAt = now
  emit()
  return current
}

export function showApiErrorToast(
  toast: Omit<AppToast, 'id'>,
): AppToast {
  return showAppToast(toast)
}

export function dismissApiErrorToast(id?: number): void {
  if (!current || (id !== undefined && current.id !== id)) {
    return
  }
  current = null
  emit()
}

export function reportApiError(error: ApiErrorFacts): void {
  const presentation = describeApiError(error)
  if (presentation.silent) {
    return
  }
  showApiErrorToast({ messageKey: presentation.messageKey })
}

export const apiErrorToastStore = {
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot() {
    return current
  },
}

export function resetApiErrorToastForTest(): void {
  current = null
  nextId = 0
  lastSignature = ''
  lastShownAt = 0
  emit()
}
