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
      sx={{
        minHeight: '100vh',
        display: 'grid',
        bgcolor: 'background.default',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
      }}
    >
      <Box
        className="login-rise"
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: workspaceSpace.md,
          px: { xs: workspaceSpace.lg, md: workspaceSpace.xl },
          py: { xs: workspaceSpace.xl, md: workspaceSpace.xl },
          bgcolor: 'background.paper',
          borderColor: 'divider',
          borderRight: { xs: 0, md: 1 },
          borderBottom: { xs: 1, md: 0 },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: { xs: workspaceSpace.lg, md: workspaceSpace.xl },
            left: { xs: workspaceSpace.lg, md: workspaceSpace.xl },
            width: 28,
            height: 2,
            bgcolor: 'primary.main',
          }}
        />
        <Typography
          component="h1"
          sx={{
            fontFamily: displayFont,
            fontWeight: 400,
            fontSize: 'clamp(2.75rem, 7vw, 4.5rem)',
            lineHeight: 0.95,
            letterSpacing: 0,
            color: 'text.primary',
          }}
        >
          {t('login.brand')}
        </Typography>
        <Box sx={{ width: 48, height: '1px', bgcolor: 'text.primary', opacity: 0.3 }} />
        <Typography
          sx={{
            maxWidth: '34ch',
            fontSize: { xs: '0.95rem', md: '1rem' },
            lineHeight: 1.7,
            color: 'text.secondary',
          }}
        >
          {t('login.tagline')}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', opacity: 0.72, letterSpacing: '0.02em' }}
        >
          {t('login.modes')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: workspaceSpace.lg, md: workspaceSpace.xl },
          py: { xs: workspaceSpace.xl, md: workspaceSpace.xl },
        }}
      >
        <Paper
          className="login-rise login-rise-delayed"
          variant="outlined"
          sx={{ width: '100%', maxWidth: 360, p: workspaceSpace.lg, borderRadius: workspaceRadiusPx.lg }}
        >
          <Stack spacing={workspaceSpace.md}>
            <Stack spacing={workspaceSpace.xxs}>
              <Typography variant="h6">{t('login.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('login.subtitle')}
              </Typography>
            </Stack>

            {providersQuery.isPending ? (
              <Stack
                direction="row"
                spacing={workspaceSpace.sm}
                sx={{ py: workspaceSpace.md, alignItems: 'center' }}
              >
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  {t('login.loading')}
                </Typography>
              </Stack>
            ) : providersQuery.isError ? (
              <Stack data-testid="login-error" spacing={workspaceSpace.sm}>
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
              <Stack spacing={workspaceSpace.sm}>
                {providers.map((provider) => {
                  const label = providerLabel(provider.name, t)
                  return (
                    <Button
                      key={provider.name}
                      data-provider={provider.name}
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<ProviderIcon name={provider.name} />}
                      onClick={() => goToAuthLogin({ provider: provider.name, from: 'web', returnTo })}
                      sx={{ py: 1.1 }}
                    >
                      {t('login.continueWith', { provider: label })}
                    </Button>
                  )
                })}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
