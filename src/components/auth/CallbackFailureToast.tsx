import { useState } from 'react'
import { Alert, Snackbar } from '@mui/material'

/**
 * 回调失败的 toast 提示（文案由调用方给，已是 human-readable 的本地化文本）。
 *
 * 不带关闭按钮：只靠 5 秒自动消失（Esc 也能关）。`Snackbar` 自己的 `onClose`
 * 必须留着——MUI 只在给了它的时候才启动自动隐藏计时。
 */
export function CallbackFailureToast({ message }: { message: string }) {
  const [open, setOpen] = useState(true)

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') {
          setOpen(false)
        }
      }}
    >
      <Alert
        data-testid="callback-failure-toast"
        severity="error"
        variant="filled"
        sx={{ maxWidth: 460, textAlign: 'left' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
