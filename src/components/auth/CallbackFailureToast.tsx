import { useEffect, useState } from 'react'
import { Alert, Snackbar } from '@mui/material'

/** toast 停留时长。 */
const TOAST_DURATION_MS = 5000

/**
 * 回调失败的 toast 提示（文案由调用方给，已是 human-readable 的本地化文本）。
 *
 * 计时器**自己管**，不用 `Snackbar` 的 `autoHideDuration`：MUI 那条路径会在
 * `mouseenter` 和 `window.blur` 时暂停计时、只在移开鼠标/窗口重新聚焦时恢复，
 * 于是鼠标停在 toast 上（或开着 devtools）就永远不消失。这里固定 5 秒后关闭，
 * 没有暂停/恢复，也不给关闭按钮。
 */
export function CallbackFailureToast({ message }: { message: string }) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      // 只用于 Esc 关闭；自动关闭由上面的计时器负责，所以不传 autoHideDuration。
      onClose={() => setOpen(false)}
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
