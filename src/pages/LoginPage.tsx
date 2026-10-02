import type { MouseEvent, ReactElement } from 'react'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import AppleIcon from '@mui/icons-material/Apple'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useQuery } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router-dom'
import { getAuthProviders, goToAuthLogin } from '../api/auth'
import { sanitizeReturnTo } from '../lib/auth'
import { useMeQuery } from '../components/auth/useMeQuery'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../components/notebook-workspace/shared/ui/typeTokens'

/**
 * Card-less auth column (reference: brand mark → title → provider stack → sign-up row).
 * No panel background: the buttons themselves are the only raised surfaces.
 */
const authColumnMaxWidth = 400
const providerGap = 1.5

const authFocusRing = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
} satisfies SxProps<Theme>

/** Third-party buttons share one spec: 44px tall, hairline outline, centered icon + label. */
const providerButtonSx: SxProps<Theme> = {
  minHeight: 44,
  whiteSpace: 'nowrap',
  // Paper fill so the button reads as a surface now that the card is gone.
  bgcolor: 'background.paper',
  // MUI default is 8px; the reference sits the mark a touch further from the label.
  '& .MuiButton-startIcon': { mr: '10px' },
  ...authFocusRing,
}

/** Inline text links stay quiet until hovered — underline is the only affordance. */
const textLinkSx: SxProps<Theme> = {
  color: 'inherit',
  textDecoration: 'underline',
  textDecorationColor: 'var(--color-rule-2)',
  textUnderlineOffset: '3px',
  transition: [
    `color var(--dur-short) var(--ease-out)`,
    `text-decoration-color var(--dur-short) var(--ease-out)`,
  ].join(', '),
  '&:hover': {
    color: 'primary.main',
    textDecorationColor: 'currentColor',
  },
  ...authFocusRing,
}

/** Terms / Privacy pages do not exist yet — keep the links from bouncing off the catch-all route. */
function preventPlaceholderNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

function providerLabel(name: string, t: (key: string) => string): string {
  const known = t(`provider.${name}`)
  return known === `provider.${name}` ? name : known
}

function GoogleGlyph({ size }: { size: number }) {
  // Brand mark stays four-color (Google identity), unlike the quiet monochrome UI icons.
  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      sx={{ width: size, height: size, display: 'block', flex: '0 0 auto' }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Box>
  )
}

/** Backend decides which providers exist; unknown names fall back to no mark. */
function providerIcon(name: string): ReactElement | null {
  if (name === 'github') {
    return <GitHubIcon sx={{ fontSize: workspaceIconSize.md }} />
  }
  if (name === 'apple') {
    return <AppleIcon sx={{ fontSize: workspaceIconSize.md }} />
  }
  if (name === 'google') {
    return <GoogleGlyph size={workspaceIconSize.md} />
  }
  return null
}

export function LoginPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  const meQuery = useMeQuery()

  const providersQuery = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: getAuthProviders,
    retry: false,
  })

  if (meQuery.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (meQuery.isSuccess) {
    return <Navigate to={returnTo} replace />
  }

  const providers = providersQuery.data?.providers ?? []

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
        aria-busy={providersQuery.isPending}
        spacing={3}
        sx={{ width: '100%', maxWidth: authColumnMaxWidth, alignItems: 'center', textAlign: 'center' }}
      >
        <Stack spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
          <Typography id="auth-title" variant="h5">
            {t('login.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {t('login.subtitle')}
          </Typography>
        </Stack>

        {providersQuery.isPending ? (
          <Stack
            direction="row"
            spacing={workspaceSpace.sm}
            aria-live="polite"
            sx={{ minHeight: 44, alignItems: 'center' }}
          >
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              {t('login.loading')}
            </Typography>
          </Stack>
        ) : providersQuery.isError ? (
          <Stack
            data-testid="login-error"
            spacing={workspaceSpace.md}
            sx={{ width: '100%', alignItems: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('login.error')}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => void providersQuery.refetch()}
              sx={providerButtonSx}
            >
              {t('login.retry')}
            </Button>
          </Stack>
        ) : providers.length === 0 ? (
          <Typography data-testid="login-empty" variant="body2" color="text.secondary">
            {t('login.empty')}
          </Typography>
        ) : (
          <Stack spacing={providerGap} sx={{ width: '100%' }}>
            {providers.map((provider) => {
              const label = providerLabel(provider.name, t)
              return (
                <Button
                  key={provider.name}
                  data-provider={provider.name}
                  variant="outlined"
                  fullWidth
                  startIcon={providerIcon(provider.name) ?? undefined}
                  onClick={() => goToAuthLogin({ provider: provider.name, from: 'web', returnTo })}
                  sx={providerButtonSx}
                >
                  {t('login.continueWith', { provider: label })}
                </Button>
              )
            })}
          </Stack>
        )}

      </Stack>

      {/* Legal — narrower than the column so it wraps into two quiet lines. */}
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
    </Box>
  )
}
