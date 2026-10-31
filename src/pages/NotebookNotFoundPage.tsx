import FolderOffOutlinedIcon from '@mui/icons-material/FolderOffOutlined'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppShellHeader } from '../components/shell/AppShellHeader'
import {
  workspaceLayout,
  workspaceSpace,
} from '../components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../components/notebook-workspace/shared/ui/typeTokens'

interface NotebookNotFoundPageProps {
  isRetrying?: boolean
  onRetry?: () => void
}

/**
 * 笔记本不存在/无权访问时替换整个工作区。
 * 顶栏固定；下方空状态在剩余视口内垂直+水平居中。
 */
export function NotebookNotFoundPage({
  isRetrying = false,
  onRetry,
}: NotebookNotFoundPageProps) {
  const { t } = useTranslation('workspace')

  return (
    <Container
      maxWidth="lg"
      data-testid="notebook-not-found"
      sx={{
        py: workspaceSpace.xl,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Stack spacing={workspaceLayout.panelPaddingY} sx={{ flex: 1, minHeight: 0 }}>
        <AppShellHeader />
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />

        <Stack
          spacing={workspaceSpace.md}
          sx={{
            flex: 1,
            minHeight: 0,
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            px: workspaceSpace.md,
          }}
        >
          <FolderOffOutlinedIcon
            aria-hidden
            sx={{ fontSize: workspaceIconSize.xl, color: 'text.disabled' }}
          />
          <Stack spacing={workspaceSpace.xs} sx={{ alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('workspace:notFound.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('workspace:notFound.description')}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={workspaceSpace.sm}
            sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <Button component={Link} to="/" variant="contained" size="small">
              {t('workspace:notFound.backHome')}
            </Button>
            {onRetry ? (
              <Button
                data-testid="notebook-not-found-retry"
                variant="text"
                size="small"
                onClick={onRetry}
                disabled={isRetrying}
              >
                {isRetrying
                  ? t('workspace:notFound.retrying')
                  : t('workspace:notFound.retry')}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Container>
  )
}
