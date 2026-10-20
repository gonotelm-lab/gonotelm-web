import FolderOffRoundedIcon from '@mui/icons-material/FolderOffRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  workspaceRadius,
  workspaceSpace,
} from '../components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../components/notebook-workspace/shared/ui/typeTokens'

interface NotebookNotFoundPageProps {
  isRetrying?: boolean
  onRetry?: () => void
}

/**
 * 笔记本不存在/无权访问时替换整个工作区。
 *
 * 不复用通用错误页：这里要明确告诉用户「链接还在，但笔记本没了」，
 * 并给出返回首页和重试两个动作。
 */
export function NotebookNotFoundPage({
  isRetrying = false,
  onRetry,
}: NotebookNotFoundPageProps) {
  const { t } = useTranslation('workspace')

  return (
    <Box
      data-testid="notebook-not-found"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: workspaceSpace.lg,
      }}
    >
      <Stack
        spacing={workspaceSpace.lg}
        sx={{
          width: '100%',
          maxWidth: 520,
          alignItems: 'center',
          textAlign: 'center',
          p: { xs: workspaceSpace.lg, md: workspaceSpace.xl },
          border: 1,
          borderColor: 'divider',
          borderRadius: workspaceRadius.lg,
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          <FolderOffRoundedIcon sx={{ fontSize: workspaceIconSize.xl }} />
        </Box>

        <Stack spacing={workspaceSpace.sm}>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
            {t('workspace:notFound.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('workspace:notFound.description')}
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={workspaceSpace.sm}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button
            component={Link}
            to="/"
            variant="contained"
            sx={{ minWidth: 140 }}
          >
            {t('workspace:notFound.backHome')}
          </Button>
          {onRetry ? (
            <Button
              data-testid="notebook-not-found-retry"
              variant="outlined"
              onClick={onRetry}
              disabled={isRetrying}
              sx={{ minWidth: 140 }}
            >
              {isRetrying
                ? t('workspace:notFound.retrying')
                : t('workspace:notFound.retry')}
            </Button>
          ) : null}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {t('workspace:notFound.hint')}
        </Typography>
      </Stack>
    </Box>
  )
}
