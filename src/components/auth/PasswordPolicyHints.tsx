import { Stack, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedOutlinedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined'
import { useTranslation } from 'react-i18next'
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  hasDigit,
  hasLowerCase,
  hasUpperCase,
  passwordByteLength,
} from '../../lib/authValidation'

interface PasswordPolicyHintsProps {
  /** 当前密码明文。 */
  value: string
  /** 服务端 prefetch 下发的要求复杂密码（大写 + 小写 + 数字）。 */
  requireComplex: boolean
  /** 为真时把没满足的条目标成错误色；为假时只做中性提示。 */
  showErrors: boolean
  testId?: string
}

interface PolicyHint {
  key: string
  label: string
  met: boolean
}

/**
 * 密码策略的实时清单：逐条显示「至少 N 位 / 大写 / 小写 / 数字」是否已满足。
 *
 * 复杂密码是服务端 prefetch 下发的部署配置，静态一句话说不清用户到底差哪条；
 * 这里随输入实时刷新，满足的条目转绿，未满足的按 showErrors 决定是灰还是红。
 */
export function PasswordPolicyHints({
  value,
  requireComplex,
  showErrors,
  testId,
}: PasswordPolicyHintsProps) {
  const { t } = useTranslation('auth')
  const bytes = passwordByteLength(value)

  const hints: PolicyHint[] = [
    {
      key: 'length',
      label: t('password.ruleLength', { min: PASSWORD_MIN_LENGTH }),
      met: bytes >= PASSWORD_MIN_LENGTH,
    },
  ]

  // 超长是个例外状态，不满足时才出现，避免平时多一条噪音。
  if (bytes > PASSWORD_MAX_BYTES) {
    hints.push({
      key: 'max',
      label: t('password.ruleMax', { max: PASSWORD_MAX_BYTES }),
      met: false,
    })
  }

  if (requireComplex) {
    hints.push(
      { key: 'upper', label: t('password.ruleUpper'), met: hasUpperCase(value) },
      { key: 'lower', label: t('password.ruleLower'), met: hasLowerCase(value) },
      { key: 'digit', label: t('password.ruleDigit'), met: hasDigit(value) },
    )
  }

  return (
    <Stack
      component="ul"
      data-testid={testId}
      spacing={0.25}
      sx={{ m: 0, mt: 0.5, pl: 0, listStyle: 'none' }}
    >
      {hints.map((hint) => {
        const color = hint.met ? 'success.main' : showErrors ? 'error.main' : 'text.secondary'
        return (
          <Stack
            key={hint.key}
            component="li"
            data-testid={testId ? `${testId}-${hint.key}` : undefined}
            data-met={hint.met}
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center' }}
          >
            {hint.met ? (
              <CheckCircleOutlinedIcon sx={{ fontSize: 14, color }} />
            ) : (
              <RadioButtonUncheckedOutlinedIcon sx={{ fontSize: 14, color }} />
            )}
            <Typography variant="caption" sx={{ color }}>
              {hint.label}
            </Typography>
          </Stack>
        )
      })}
    </Stack>
  )
}
