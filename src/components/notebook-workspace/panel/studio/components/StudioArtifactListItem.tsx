import { useState } from 'react'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
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
  succeeded: '已完成',
  cancelled: '已取消',
  failed: '失败',
}

const statusColorMap: Record<StudioArtifactVisualStatus, string> = {
  queued: 'warning.main',
  polling: 'warning.main',
  succeeded: 'success.main',
  cancelled: 'text.disabled',
  failed: 'error.main',
}

const minuteMs = 60 * 1_000
const hourMs = 60 * minuteMs
const dayMs = 24 * hourMs
const weekMs = 7 * dayMs

const formatArtifactRelativeTime = (createdAt: number) => {
  if (!Number.isFinite(createdAt) || createdAt <= 0) {
    return '刚刚'
  }
  const elapsed = Math.max(0, Date.now() - createdAt)
  if (elapsed < minuteMs) {
    return '刚刚'
  }
  if (elapsed < hourMs) {
    return `${Math.floor(elapsed / minuteMs)}m前`
  }
  if (elapsed < dayMs) {
    return `${Math.floor(elapsed / hourMs)}h前`
  }
  if (elapsed < weekMs) {
    return `${Math.floor(elapsed / dayMs)}d前`
  }
  return `${Math.floor(elapsed / weekMs)}w前`
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
  const isCancelled = visualStatus === 'cancelled'
  const cancelledItemTextColor = isCancelled ? 'text.disabled' : 'text.secondary'
  const canPreview = isStudioTaskCompleted(item.status)
  const canRetry = isStudioTaskRetryable(item.status)
  const canCancel = isStudioTaskRunning(item.status)
  const canDelete = !isStudioTaskRunning(item.status)
  const sourceCount = item.sourceIds.length || item.sourceCount
  const itemMetaLabel = `${sourceCount}个来源，${formatArtifactRelativeTime(item.createdAt)}`
  const KindIcon = item.kind === 'report'
    ? DescriptionRoundedIcon
    : item.kind === 'info_graphic'
      ? BarChartRoundedIcon
      : AccountTreeRoundedIcon
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
        cursor: canPreview ? 'pointer' : 'default',
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        borderColor: statusColorMap[visualStatus],
        '&:hover': {
          borderColor: canPreview ? 'primary.main' : statusColorMap[visualStatus],
          backgroundColor: 'action.hover',
        },
        ...(previewLoading ? { borderColor: 'primary.main' } : null),
      }}
      role={canPreview ? 'button' : undefined}
      tabIndex={canPreview ? 0 : -1}
      aria-label={`${item.title}，${statusLabelMap[visualStatus]}`}
      onClick={() => {
        if (actionMenuOpen) {
          return
        }
        if (canPreview && !previewLoading) {
          onPreview(item)
        }
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (
          canPreview &&
          (event.key === 'Enter' || event.key === ' ') &&
          !previewLoading
        ) {
          event.preventDefault()
          onPreview(item)
        }
      }}
    >
      {/* 复用 source 上传中的流光动画，保持异步状态反馈一致性。 */}
      <FlowLoadingOverlay active={shouldStudioTaskKeepPolling(item.status)} />
      <Stack sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', minWidth: 0 }}>
              <KindIcon sx={{ fontSize: 17, color: cancelledItemTextColor, flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: isCancelled ? 'text.disabled' : 'text.primary' }}
                noWrap
              >
                {item.title}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              noWrap
              sx={{ mt: 0.25, ml: 3.15, display: 'block', color: cancelledItemTextColor }}
            >
              {itemMetaLabel}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', flexShrink: 0, ml: 0.6 }}>
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
