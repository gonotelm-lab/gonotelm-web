import { useState } from 'react'
import { Stack, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  isComplexPassword,
  passwordByteLength,
} from '../../lib/authValidation'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { PasswordPolicyHints } from './PasswordPolicyHints'
import { PasswordVisibilityToggle } from './PasswordVisibilityToggle'

interface NewPasswordFieldsProps {
  /** 新密码明文（受控，调用方持有它才能提交）。 */
  password: string
  /** 确认新密码明文（受控）。 */
  confirm: string
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  /** 服务端 prefetch 下发的复杂密码要求（`useRequireComplexPassword`）。 */
  requireComplex: boolean
  /**
   * 是否把未满足的策略规则标红。
   *
   * 调用方传「点过保存，或者用户已经开始输入」——空着没动过时不提前骂人，
   * 这条判断留在调用方是为了让它同时管住「当前密码必填」等其他错误态。
   */
  showErrors: boolean
  disabled?: boolean
  /** data-testid 前缀：`{prefix}-new-input` / `{prefix}-confirm-input` / `{prefix}-hints`。 */
  testIdPrefix: string
  /** 打开页面直接落在这一步时聚焦新密码框（找回密码页的链接模式）。 */
  autoFocus?: boolean
}

/**
 * 「新密码 + 确认新密码」字段组，含实时策略清单与两个显隐切换。
 *
 * 改密码（`/set-password`、设置弹窗）与找回密码（`/reset-password`）共用同一套
 * 规则与文案：密码策略是服务端下发的部署配置，两份实现各写一遍迟早会漂移，
 * 出现「这里放行、后端 106014 打回」。
 */
export function NewPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  requireComplex,
  showErrors,
  disabled = false,
  testIdPrefix,
  autoFocus = false,
}: NewPasswordFieldsProps) {
  const { t } = useTranslation('auth')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const bytes = passwordByteLength(password)
  const tooShort = bytes < PASSWORD_MIN_LENGTH && showErrors
  const tooLong = bytes > PASSWORD_MAX_BYTES
  // 复杂度必须和长度一样实时：只靠点保存才报，用户根本不知道差哪一条。
  const tooSimple =
    requireComplex &&
    showErrors &&
    bytes >= PASSWORD_MIN_LENGTH &&
    bytes <= PASSWORD_MAX_BYTES &&
    !isComplexPassword(password)
  const needsAttention = tooShort || tooLong || tooSimple
  const mismatch = confirm.length > 0 && confirm !== password

  return (
    <Stack spacing={workspaceSpace.md}>
      <TextField
        fullWidth
        size="small"
        autoFocus={autoFocus}
        type={showPassword ? 'text' : 'password'}
        name="new-password"
        autoComplete="new-password"
        label={t('password.newLabel')}
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        disabled={disabled}
        error={needsAttention}
        helperText={
          requireComplex ? (
            <PasswordPolicyHints
              value={password}
              requireComplex={requireComplex}
              showErrors={needsAttention}
              testId={`${testIdPrefix}-hints`}
            />
          ) : tooLong ? (
            t('signup.passwordTooLong', { max: PASSWORD_MAX_BYTES })
          ) : tooShort ? (
            t('password.weakPassword', { min: PASSWORD_MIN_LENGTH })
          ) : (
            t('password.hint', { min: PASSWORD_MIN_LENGTH })
          )
        }
        slotProps={{
          htmlInput: { 'data-testid': `${testIdPrefix}-new-input` },
          input: {
            endAdornment: (
              <PasswordVisibilityToggle
                shown={showPassword}
                onToggle={() => setShowPassword((shown) => !shown)}
                testId={`${testIdPrefix}-new-visibility`}
              />
            ),
          },
          // 清单是 <ul>，不能塞进 FormHelperText 默认的 <p> 里
          formHelperText: { component: 'div' },
        }}
      />
      <TextField
        fullWidth
        size="small"
        type={showConfirm ? 'text' : 'password'}
        name="confirm-password"
        autoComplete="new-password"
        label={t('password.confirmLabel')}
        value={confirm}
        onChange={(event) => onConfirmChange(event.target.value)}
        disabled={disabled}
        error={mismatch}
        helperText={mismatch ? t('password.mismatch') : undefined}
        slotProps={{
          htmlInput: { 'data-testid': `${testIdPrefix}-confirm-input` },
          input: {
            endAdornment: (
              <PasswordVisibilityToggle
                shown={showConfirm}
                onToggle={() => setShowConfirm((shown) => !shown)}
                testId={`${testIdPrefix}-confirm-visibility`}
              />
            ),
          },
        }}
      />
    </Stack>
  )
}
