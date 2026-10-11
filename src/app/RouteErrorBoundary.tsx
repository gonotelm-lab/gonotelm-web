import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router-dom'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/**
 * 路由级兜底：任何页面渲染/加载抛错时给一个可恢复的界面，而不是白屏。
 *
 * 界面上不铺内部错误信息（只留一句通用说明 + 重试），细节进控制台。
 */
export function RouteErrorBoundary() {
  const { t } = useTranslation('common')
  const error = useRouteError()

  if (import.meta.env.DEV) {
    console.error('route error', error)
  }

  return (
    <Stack
      data-testid="route-error"
      spacing={workspaceSpace.lg}
      sx={{
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: workspaceSpace.lg,
        textAlign: 'center',
      }}
    >
      <Box>
        <Typography variant="h6">{t('routeError.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceSpace.sm }}>
          {t('routeError.description')}
        </Typography>
      </Box>
      <Button
        data-testid="route-error-reload"
        variant="outlined"
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }}
      >
        {t('routeError.reload')}
      </Button>
    </Stack>
  )
}
