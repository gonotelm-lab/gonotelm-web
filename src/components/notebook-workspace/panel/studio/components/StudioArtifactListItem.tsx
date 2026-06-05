import { useState } from 'react'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import { IconButton, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { FlowLoadingOverlay } from '@/components/notebook-workspace/shared'
import {
  isStudioTaskCompleted,
  isStudioTaskRetryable,
  isStudioTaskRunning,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
  type StudioArtifactVisualStatus,
} from '../artifactStatus'
import type { StudioArtifactItem } from '../types'

interface StudioArtifactListItemProps {
  item: StudioArtifactItem
  previewLoading: boolean
  retryPending: boolean
  cancelPending: boolean
  deletePending: boolean
  onPreview: (item: StudioArtifactItem) => void
  onRetry: (item: StudioArtifactItem) => void
  onCancel: (item: StudioArtifactItem) => void
  onDelete: (item: StudioArtifactItem) => void
}

const statusLabelMap: Record<StudioArtifactVisualStatus, string> = {
  queued: '排队中',
  polling: '生成中',
  succeeded: '完成',
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
  retryPending,
  cancelPending,
  deletePending,
  onPreview,
  onRetry,
  onCancel,
  onDelete,
}: StudioArtifactListItemProps) {
  const visualStatus = toArtifactVisualStatus(item.status)
  const StatusIcon = statusIconMap[visualStatus]
  const canPreview = isStudioTaskCompleted(item.status)
  const canRetry = isStudioTaskRetryable(item.status)
  const canCancel = isStudioTaskRunning(item.status)
  const canDelete = !isStudioTaskRunning(item.status)
  const failedHint = item.error || '任务执行失败，请重试。'
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null)
  const actionMenuOpen = Boolean(actionMenuAnchorEl)
  const actionMenuItemSx = {
    minHeight: 34,
    px: 1.25,
    display: 'flex',
    alignItems: 'center',
  }
  const actionMenuIconSx = { fontSize: 16, color: 'text.secondary' }
  const actionMenuTextSx = { fontSize: 12.5, lineHeight: 1.2, ml: 'auto', pl: 1.5 }

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 1.1,
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        '&:hover': {
          borderColor: canPreview ? 'primary.main' : 'divider',
          backgroundColor: 'action.hover',
        },
        ...(previewLoading ? { borderColor: 'primary.main' } : null),
        borderStyle: item.status === 'failed' ? 'dashed' : 'solid',
      }}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (actionMenuOpen) {
          return
        }
        if (!previewLoading) {
          onPreview(item)
        }
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if ((event.key === 'Enter' || event.key === ' ') && !previewLoading) {
          event.preventDefault()
          onPreview(item)
        }
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
          <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', flexShrink: 0 }}>
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
            <Tooltip title={canPreview ? '点击卡片可预览' : '当前任务未完成，点击卡片将提示原因'}>
              <span>
                <Typography variant="caption" color="text.secondary">
                  {statusLabelMap[visualStatus]}
                </Typography>
              </span>
            </Tooltip>
            <Tooltip title="更多操作">
              <span>
                <IconButton
                  size="small"
                  color="default"
                  aria-label={`更多操作 ${item.title}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActionMenuAnchorEl(event.currentTarget)
                  }}
                >
                  <MoreHorizIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              anchorEl={actionMenuAnchorEl}
              open={actionMenuOpen}
              onClose={() => {
                setActionMenuAnchorEl(null)
              }}
              onClick={(event) => event.stopPropagation()}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                disabled={!canCancel || cancelPending}
                sx={actionMenuItemSx}
                onClick={(event) => {
                  event.stopPropagation()
                  setActionMenuAnchorEl(null)
                  onCancel(item)
                }}
              >
                <CancelRoundedIcon sx={actionMenuIconSx} />
                <Typography sx={actionMenuTextSx}>
                  {cancelPending ? '取消中...' : '取消'}
                </Typography>
              </MenuItem>
              <MenuItem
                disabled={!canRetry || retryPending}
                sx={actionMenuItemSx}
                onClick={(event) => {
                  event.stopPropagation()
                  setActionMenuAnchorEl(null)
                  onRetry(item)
                }}
              >
                <ReplayRoundedIcon sx={actionMenuIconSx} />
                <Typography sx={actionMenuTextSx}>
                  {retryPending ? '重试中...' : '重试'}
                </Typography>
              </MenuItem>
              <MenuItem
                disabled={!canDelete || deletePending}
                sx={actionMenuItemSx}
                onClick={(event) => {
                  event.stopPropagation()
                  setActionMenuAnchorEl(null)
                  onDelete(item)
                }}
              >
                <DeleteOutlineRoundedIcon sx={actionMenuIconSx} />
                <Typography sx={actionMenuTextSx}>
                  {deletePending ? '删除中...' : '删除'}
                </Typography>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  )
}
