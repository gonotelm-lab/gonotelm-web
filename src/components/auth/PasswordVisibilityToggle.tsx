import { IconButton, InputAdornment } from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useTranslation } from 'react-i18next'

interface PasswordVisibilityToggleProps {
  /** 当前是否明文显示。 */
  shown: boolean
  onToggle: () => void
  /** 挂在按钮上的 data-testid。 */
  testId: string
}

/**
 * 密码框末尾的「眼睛」，供注册页与设置密码表单共用。
 *
 * 必须渲染成 `type="button"`：默认的 submit 会在切换显隐时顺手把表单提交出去。
 */
export function PasswordVisibilityToggle({ shown, onToggle, testId }: PasswordVisibilityToggleProps) {
  const { t } = useTranslation('common')

  return (
    <InputAdornment position="end">
      <IconButton
        type="button"
        edge="end"
        size="small"
        data-testid={testId}
        aria-label={shown ? t('action.hidePassword') : t('action.showPassword')}
        onClick={onToggle}
      >
        {shown ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </InputAdornment>
  )
}
