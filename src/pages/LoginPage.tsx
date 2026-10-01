import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router-dom'
import { getAuthProviders, goToAuthLogin } from '../api/auth'
import { sanitizeReturnTo } from '../lib/auth'
import { useMeQuery } from '../components/auth/useMeQuery'
import { workspaceSpace, workspaceRadiusPx } from '../components/notebook-workspace/shared/ui/layoutTokens'

const displayFont = 'var(--font-display)'

function providerLabel(name: string, t: (key: string) => string): string {
  const known = t(`provider.${name}`)
  return known === `provider.${name}` ? name : known
}

function ProviderIcon({ name }: { name: string }) {
  if (name === 'github') {
    return <GitHubIcon fontSize="small" />
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
        bgcolor: 'background.default',
        px: workspaceSpace.lg,
        pt: { xs: 6, md: 10 },
        pb: { xs: 6, md: 8 },
      }}
    >
      <Stack
        className="login-rise"
        direction="row"
        spacing={1.25}
        sx={{ alignItems: 'center', mb: { xs: 3, md: 4 } }}
      >
        <Box
          component="img"
          src="/favicon.svg"
          alt=""
          aria-hidden
          sx={{ width: 28, height: 28, display: 'block' }}
        />
        <Typography
          sx={{
            fontFamily: displayFont,
            fontWeight: 400,
            fontSize: '1.375rem',
            lineHeight: 1,
            letterSpacing: 0,
            color: 'text.primary',
            whiteSpace: 'nowrap',
          }}
        >
          {t('login.brand')}
        </Typography>
      </Stack>

      <Paper
        className="login-rise login-rise-delayed"
        component="section"
        aria-labelledby="auth-title"
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 2.5, sm: 4 },
          borderRadius: workspaceRadiusPx.lg,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Stack spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
            <Typography id="auth-title" variant="h5" sx={{ letterSpacing: '-0.01em' }}>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('login.subtitle')}
            </Typography>
          </Stack>

          {providersQuery.isPending ? (
            <Stack
              direction="row"
              spacing={workspaceSpace.sm}
              sx={{ py: workspaceSpace.sm, alignItems: 'center' }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                {t('login.loading')}
              </Typography>
            </Stack>
          ) : providersQuery.isError ? (
            <Stack data-testid="login-error" spacing={workspaceSpace.md} sx={{ width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {t('login.error')}
              </Typography>
              <Button variant="outlined" onClick={() => void providersQuery.refetch()}>
                {t('login.retry')}
              </Button>
            </Stack>
          ) : providers.length === 0 ? (
            <Typography data-testid="login-empty" variant="body2" color="text.secondary">
              {t('login.empty')}
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ width: '100%' }}>
              {providers.map((provider) => {
                const label = providerLabel(provider.name, t)
                return (
                  <Button
                    key={provider.name}
                    data-provider={provider.name}
                    variant="outlined"
                    fullWidth
                    startIcon={<ProviderIcon name={provider.name} />}
                    onClick={() => goToAuthLogin({ provider: provider.name, from: 'web', returnTo })}
                    sx={{ minHeight: 44, fontWeight: 600 }}
                  >
                    {t('login.continueWith', { provider: label })}
                  </Button>
                )
              })}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mt: { xs: 4, md: 6 },
          maxWidth: 380,
          textAlign: 'center',
          fontSize: '0.8125rem',
          lineHeight: 1.6,
        }}
      >
        {t('login.legal')}
      </Typography>
    </Box>
  )
}
