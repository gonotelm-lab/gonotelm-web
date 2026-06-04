import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import PreviewRoundedIcon from '@mui/icons-material/PreviewRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import { IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { FlowLoadingOverlay } from '@/components/notebook-workspace/shared'
import {
  isStudioTaskCompleted,
  isStudioTaskFailed,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
  type StudioArtifactVisualStatus,
} from '../artifactStatus'
import type { StudioArtifactItem } from '../types'

interface StudioArtifactListItemProps {
  item: StudioArtifactItem
  previewLoading: boolean
  retryDisabled: boolean
  onPreview: (item: StudioArtifactItem) => void
  onRetry: (item: StudioArtifactItem) => void
}

const statusLabelMap: Record<StudioArtifactVisualStatus, string> = {
  queued: '排队中',
  polling: '生成中',
  succeeded: '已完成',
  failed: '失败',
}

const statusColorMap: Record<StudioArtifactVisualStatus, string> = {
  queued: 'warning.main',
  polling: 'warning.main',
  succeeded: 'success.main',
  failed: 'error.main',
}

const statusIconMap: Record<StudioArtifactVisualStatus, typeof HourglassBottomRoundedIcon> = {
  queued: HourglassBottomRoundedIcon,
  polling: HourglassBottomRoundedIcon,
  succeeded: TaskAltRoundedIcon,
  failed: ErrorOutlineRoundedIcon,
}

export function StudioArtifactListItem({
  item,
  previewLoading,
  retryDisabled,
  onPreview,
  onRetry,
}: StudioArtifactListItemProps) {
  const visualStatus = toArtifactVisualStatus(item.status)
  const StatusIcon = statusIconMap[visualStatus]
  const canPreview = isStudioTaskCompleted(item.status)
  const canRetry = isStudioTaskFailed(item.status)
  const failedHint = item.error || '任务执行失败，请重试。'

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 1.1,
        borderStyle: item.status === 'failed' ? 'dashed' : 'solid',
      }}
    >
      {/* 复用 source 上传中的流光动画，保持异步状态反馈一致性。 */}
      <FlowLoadingOverlay active={shouldStudioTaskKeepPolling(item.status)} />
      <Stack sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', minWidth: 0 }}>
            <AccountTreeRoundedIcon sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {item.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Tooltip title={visualStatus === 'failed' ? failedHint : statusLabelMap[visualStatus]}>
              <StatusIcon
                sx={{
                  fontSize: 17,
                  color: statusColorMap[visualStatus],
                  flexShrink: 0,
                  ...(visualStatus === 'polling'
                    ? {
                        animation: 'studioArtifactPollingSpin 1s linear infinite',
                        '@keyframes studioArtifactPollingSpin': {
                          from: { transform: 'rotate(0deg)' },
                          to: { transform: 'rotate(360deg)' },
                        },
                      }
                    : null),
                }}
              />
            </Tooltip>
            <Tooltip title={canPreview ? '预览产物' : '当前不可预览'}>
              <span>
                <IconButton
                  size="small"
                  color="default"
                  disabled={!canPreview || previewLoading}
                  aria-label={`预览 ${item.title}`}
                  onClick={() => onPreview(item)}
                >
                  <PreviewRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
            {canRetry ? (
              <Tooltip title="重试生成">
                <span>
                  <IconButton
                    size="small"
                    color="default"
                    disabled={retryDisabled}
                    aria-label={`重试 ${item.title}`}
                    onClick={() => onRetry(item)}
                  >
                    <ReplayRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  )
}
