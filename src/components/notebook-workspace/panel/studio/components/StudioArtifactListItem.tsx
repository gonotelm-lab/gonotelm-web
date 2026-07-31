import { useState } from 'react'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import SourceRoundedIcon from '@mui/icons-material/SourceRounded'
import QuizRoundedIcon from '@mui/icons-material/QuizRounded'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded'
import type { SvgIconComponent } from '@mui/icons-material'
import type { StudioArtifactKind } from '@/types/api'
import { IconButton, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import {
  FlowLoadingOverlay,
  workspaceLayout,
  workspaceSpace,
  workspaceTransitionPresets,
} from '@/components/notebook-workspace/shared'
import {
  isStudioTaskCompleted,
  isStudioTaskRetryable,
  isStudioTaskRunning,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
  type StudioArtifactVisualStatus,
} from '../artifactStatus'
import { getStudioArtifactPreviewCapability } from '../preview/previewCapabilities'
import { resolveStudioArtifactDisplayTitle } from '../resolveStudioArtifactKind'
import type { StudioArtifactItem } from '../types'
import { workspaceIconSize, workspaceType } from '@/components/notebook-workspace/shared/ui/typeTokens'

interface StudioArtifactListItemProps {
  item: StudioArtifactItem
  previewLoading: boolean
  retryPending: boolean
  cancelPending: boolean
  deletePending: boolean
  convertPending: boolean
  onPreview: (item: StudioArtifactItem) => void
  onRetry: (item: StudioArtifactItem) => void
  onCancel: (item: StudioArtifactItem) => void
  onDelete: (item: StudioArtifactItem) => void
  onConvertToSource: (item: StudioArtifactItem) => void
}

const statusLabelMap: Record<StudioArtifactVisualStatus, string> = {
  queued: '排队中',
  polling: '生成中',
  succeeded: '已完成',
  cancelled: '已取消',
  failed: '失败',
}

const resolveArtifactStatusTone = (
  visualStatus: StudioArtifactVisualStatus,
  theme: Theme,
) => {
  const artifactPalette = theme.palette.mode === 'dark'
    ? theme.workspacePalette.artifactList.dark
    : theme.workspacePalette.artifactList.light
  return artifactPalette[visualStatus]
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

const artifactKindIconMap: Record<StudioArtifactKind, SvgIconComponent> = {
  mindmap: AccountTreeRoundedIcon,
  report: MenuBookRoundedIcon,
  info_graphic: ImageRoundedIcon,
  audio_overview: GraphicEqRoundedIcon,
  flashcard: StyleRoundedIcon,
  quiz: QuizRoundedIcon,
  data_table: TableChartRoundedIcon,
  note: StickyNote2RoundedIcon,
}

export function StudioArtifactListItem({
  item,
  previewLoading,
  retryPending,
  cancelPending,
  deletePending,
  convertPending,
  onPreview,
  onRetry,
  onCancel,
  onDelete,
  onConvertToSource,
}: StudioArtifactListItemProps) {
  const visualStatus = toArtifactVisualStatus(item.status)
  const isCancelled = visualStatus === 'cancelled'
  const isRunning = isStudioTaskRunning(item.status)
  const previewCapability = getStudioArtifactPreviewCapability(item.kind)
  const canPreview =
    isStudioTaskCompleted(item.status) && (previewCapability.inline || previewCapability.overlay)
  const canRetry = item.kind !== 'note' && isStudioTaskRetryable(item.status)
  const canCancel = item.kind !== 'note' && isRunning
  const canConvert = item.kind === 'note' && isStudioTaskCompleted(item.status)
  const canDelete = !isRunning
  const sourceCount = item.sourceIds.length || item.sourceCount
  const displayTitle = resolveStudioArtifactDisplayTitle(item.title, item.kind)
  const itemMetaLabel = item.kind === 'note'
    ? formatArtifactRelativeTime(item.createdAt)
    : `${sourceCount}个来源，${formatArtifactRelativeTime(item.createdAt)}`
  const KindIcon = artifactKindIconMap[item.kind] ?? AccountTreeRoundedIcon
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null)
  const actionMenuOpen = Boolean(actionMenuAnchorEl)
  const actionMenuItemSx = {
    minHeight: 34,
    px: workspaceSpace.md,
    display: 'flex',
    alignItems: 'center',
  }
  const actionMenuIconSx = { fontSize: workspaceIconSize.md, color: 'text.secondary' }
  const actionMenuTextSx = {
    fontSize: workspaceType.xs,
    lineHeight: 1.2,
    ml: 'auto',
    pl: workspaceSpace.md,
  }

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        ...(() => {
          const statusTone = resolveArtifactStatusTone(visualStatus, theme)
          return {
            position: 'relative',
            overflow: 'hidden',
            p: workspaceSpace.md,
            cursor: canPreview ? 'pointer' : 'default',
            bgcolor: 'background.paper',
            transition: workspaceTransitionPresets.interactiveColorBorder,
            borderColor: statusTone.border,
            '&:hover': {
              borderColor: statusTone.accent,
              backgroundColor: canPreview ? 'background.default' : 'background.paper',
            },
            '&:active': canPreview
              ? {
                  borderColor: statusTone.accent,
                  backgroundColor: 'action.selected',
                }
              : undefined,
            ...(previewLoading ? { borderColor: statusTone.accent } : null),
          }
        })(),
      })}
      role={canPreview ? 'button' : undefined}
      tabIndex={canPreview ? 0 : -1}
      aria-label={`${displayTitle}，${statusLabelMap[visualStatus]}`}
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
            <Stack
              direction="row"
              spacing={workspaceLayout.listInlineGap}
              sx={{ alignItems: 'center', minWidth: 0 }}
            >
              <KindIcon
                sx={(theme) => {
                  const statusTone = resolveArtifactStatusTone(visualStatus, theme)
                  return {
                    fontSize: workspaceIconSize.md,
                    color: isCancelled ? 'text.disabled' : statusTone.icon,
                    flexShrink: 0,
                  }
                }}
              />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: isCancelled ? 'text.disabled' : 'text.primary' }}
                noWrap
              >
                {displayTitle}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              noWrap
              sx={() => {
                return {
                  mt: workspaceSpace.xxs,
                  // Align under title text: 17px icon + listInlineGap.
                  ml: `calc(17px + ${workspaceLayout.listInlineGap * 8}px)`,
                  display: 'block',
                  color: isCancelled ? 'text.disabled' : 'text.secondary',
                }
              }}
            >
              {itemMetaLabel}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={workspaceSpace.xxs}
            sx={{ alignItems: 'center', flexShrink: 0, ml: workspaceSpace.xxs }}
          >
            <Tooltip title="更多操作">
              <span>
                <IconButton
                  size="small"
                  color="default"
                  aria-label={`更多操作 ${displayTitle}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActionMenuAnchorEl(event.currentTarget)
                  }}
                >
                  <MoreHorizIcon sx={{ fontSize: workspaceIconSize.md }} />
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
              {item.kind !== 'note' ? (
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
              ) : null}
              {item.kind === 'note' && canConvert ? (
                <MenuItem
                  disabled={convertPending}
                  sx={actionMenuItemSx}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActionMenuAnchorEl(null)
                    onConvertToSource(item)
                  }}
                >
                  <SourceRoundedIcon sx={actionMenuIconSx} />
                  <Typography sx={actionMenuTextSx}>
                    {convertPending ? '转换中...' : '转换成来源'}
                  </Typography>
                </MenuItem>
              ) : null}
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
