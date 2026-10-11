import { useState } from 'react'
import { Alert, Snackbar } from '@mui/material'
import type { CallbackFailure } from '../../lib/auth'

/**
 * 回调失败的 toast 提示。
 *
 * 目前**原样显示 `reason` 文本**（例如 `login-state-not-found`），联调期能直接看到
 * 后端到底给了什么。文案映射已经就绪（`callbackFailureText.ts` 的
 * `describeCallbackFailure(reason, provider, 'login', t)`），接上时把下面那行换掉即可。
 */
export function CallbackFailureToast({ failure }: { failure: CallbackFailure }) {
  const [open, setOpen] = useState(true)

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') {
          setOpen(false)
        }
      }}
    >
      <Alert
        data-testid="login-callback-toast"
        severity="error"
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{ maxWidth: 460, textAlign: 'left' }}
      >
        {failure.reason}
      </Alert>
    </Snackbar>
  )
}
