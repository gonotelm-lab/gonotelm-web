import { useEffect, useSyncExternalStore } from 'react'
import { Alert, Snackbar } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  apiErrorToastStore,
  dismissApiErrorToast,
  type AppToast,
} from '../../lib/apiErrorToast'

const toastDurationMs = 5000

function ApiErrorToastItem({ toast }: { toast: AppToast }) {
  const { t } = useTranslation('common')

  useEffect(() => {
    const timer = setTimeout(() => {
      dismissApiErrorToast(toast.id)
    }, toastDurationMs)
    return () => clearTimeout(timer)
  }, [toast.id])

  const handleClose = () => {
    dismissApiErrorToast(toast.id)
  }

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={handleClose}
    >
      <Alert
        data-testid="api-error-toast"
        severity={toast.severity ?? 'error'}
        variant="filled"
        onClose={handleClose}
        sx={{ maxWidth: 460, textAlign: 'left' }}
      >
        {toast.message ??
          (toast.messageKey ? t(toast.messageKey, toast.values ?? {}) : '')}
      </Alert>
    </Snackbar>
  )
}

/**
 * 全局提示宿主。请求层把「文案 key」丢进 store；页面里的非 API 错误
 * 也可以把已经翻译好的文本丢进来，统一由这里计时与关闭。
 */
export function GlobalApiErrorToast() {
  const toast = useSyncExternalStore(
    apiErrorToastStore.subscribe,
    apiErrorToastStore.getSnapshot,
    apiErrorToastStore.getSnapshot,
  )

  if (!toast) {
    return null
  }

  return <ApiErrorToastItem key={toast.id} toast={toast} />
}
