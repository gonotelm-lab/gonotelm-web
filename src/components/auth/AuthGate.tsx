import type { ReactNode } from 'react'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { isNotLoginError } from '@/lib/auth'
import { useMeQuery } from './useMeQuery'

export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation('auth')
  const { isPending, isError, error, refetch } = useMeQuery()

  if (isPending || (isError && isNotLoginError(error))) {
    return (
      <Box
        data-testid="auth-gate-loading"
        sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}
      >
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Stack
        data-testid="auth-gate-error"
        spacing={2}
        sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('gate.error')}
        </Typography>
        <Button variant="outlined" onClick={() => void refetch()}>
          {t('gate.retry')}
        </Button>
      </Stack>
    )
  }

  return <>{children}</>
}
