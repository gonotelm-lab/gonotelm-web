import type { MouseEvent, ReactElement, ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { authColumnMaxWidth, textLinkSx } from './authStyles'

/** Terms / Privacy pages do not exist yet — keep the links from bouncing off the catch-all route. */
function preventPlaceholderNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

interface AuthShellProps {
  title: string
  subtitle?: ReactNode
  /** 表单请求进行中：置 aria-busy，读屏会提示区域正在更新。 */
  busy?: boolean
  /** 条款行只在登录/注册页出现，验证与设置密码页不重复。 */
  showLegal?: boolean
  children: ReactNode
}

/**
 * 认证页的共用外壳：品牌标记 → 标题/副标题 → 表单区 →（可选）条款行。
 * 四个页面（登录/注册/验证邮箱/设置密码）共用同一条中线与同一套留白。
 */
export function AuthShell({
  title,
  subtitle,
  busy = false,
  showLegal = true,
  children,
}: AuthShellProps): ReactElement {
  const { t } = useTranslation('auth')

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: workspaceSpace.lg,
        py: { xs: 6, md: 8 },
      }}
    >
      {/* Brand — mark stacked above the wordmark so both share one center line. */}
      <Stack
        className="login-rise"
        spacing={1.5}
        sx={{ alignItems: 'center', mb: { xs: 4, md: 5 } }}
      >
        <Box
          component="img"
          src="/favicon.svg"
          alt=""
          aria-hidden
          sx={{ width: 48, height: 'auto', display: 'block' }}
        />
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '1.625rem',
            lineHeight: 1.1,
            letterSpacing: 0,
            color: 'text.primary',
            whiteSpace: 'nowrap',
          }}
        >
          {t('login.brand')}
        </Typography>
      </Stack>

      {/* Form stack — no panel behind it. */}
      <Stack
        className="login-rise login-rise-delayed"
        component="section"
        aria-labelledby="auth-title"
        aria-busy={busy}
        spacing={3}
        sx={{
          width: '100%',
          maxWidth: authColumnMaxWidth,
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Stack spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
          <Typography id="auth-title" variant="h5">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>

        {children}
      </Stack>

      {showLegal ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: { xs: 4, md: 5 },
            maxWidth: 380,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          <Trans
            t={t}
            i18nKey="login.legal"
            components={{
              terms: (
                <Box
                  component="a"
                  href="#"
                  onClick={preventPlaceholderNavigation}
                  sx={textLinkSx}
                />
              ),
              privacy: (
                <Box
                  component="a"
                  href="#"
                  onClick={preventPlaceholderNavigation}
                  sx={textLinkSx}
                />
              ),
            }}
          />
        </Typography>
      ) : null}
    </Box>
  )
}
