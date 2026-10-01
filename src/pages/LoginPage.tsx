import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router-dom'
import { getAuthProviders, goToAuthLogin } from '../api/auth'
import { sanitizeReturnTo } from '../lib/auth'
import { useMeQuery } from '../components/auth/useMeQuery'
import { workspaceSpace, workspaceRadiusPx } from '../components/notebook-workspace/shared/ui/layoutTokens'

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
        placeItems: 'center',
        bgcolor: 'background.default',
        px: workspaceSpace.lg,
      }}
    >
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 380, p: workspaceSpace.lg, borderRadius: workspaceRadiusPx.lg }}
      >
        <Stack spacing={workspaceSpace.md}>
          <Stack spacing={workspaceSpace.xxs}>
            <Typography variant="h5">{t('login.brand')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('login.subtitle')}
            </Typography>
          </Stack>

          {providersQuery.isPending ? (
            <Stack sx={{ py: workspaceSpace.lg, alignItems: 'center' }}>
              <CircularProgress size={18} />
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
                    startIcon={<ProviderIcon name={provider.name} />}
                    onClick={() => goToAuthLogin({ provider: provider.name, from: 'web', returnTo })}
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
  )
}
