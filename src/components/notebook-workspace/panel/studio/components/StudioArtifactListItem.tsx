import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined'
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import type { SvgIconComponent } from '@mui/icons-material'
import i18n from '@/i18n'
import type { StudioArtifactKind } from '@/types/api'
import { IconButton, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { FlowLoadingOverlay } from '@/components/notebook-workspace/shared/ui/FlowLoadingOverlay'
import { workspaceLayout, workspaceSpace } from '@/components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '@/components/notebook-workspace/shared/ui/motionTokens'
import {
  resolveStudioToolTone,
  resolveStudioToolToneKey,
} from '@/components/notebook-workspace/shared/ui/studioSemanticTones'
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

const getStatusLabelMap = (): Record<StudioArtifactVisualStatus, string> => ({
  queued: i18n.t('studio:artifact.status.queued'),
  polling: i18n.t('studio:artifact.status.polling'),
  succeeded: i18n.t('studio:artifact.status.succeeded'),
  cancelled: i18n.t('studio:artifact.status.cancelled'),
  failed: i18n.t('studio:artifact.status.failed'),
})

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
    return i18n.t('studio:artifact.time.justNow')
  }
  const elapsed = Math.max(0, Date.now() - createdAt)
  if (elapsed < minuteMs) {
    return i18n.t('studio:artifact.time.justNow')
  }
  if (elapsed < hourMs) {
    return i18n.t('studio:artifact.time.minutesAgo', { n: Math.floor(elapsed / minuteMs) })
  }
  if (elapsed < dayMs) {
    return i18n.t('studio:artifact.time.hoursAgo', { n: Math.floor(elapsed / hourMs) })
  }
  if (elapsed < weekMs) {
    return i18n.t('studio:artifact.time.daysAgo', { n: Math.floor(elapsed / dayMs) })
  }
  return i18n.t('studio:artifact.time.weeksAgo', { n: Math.floor(elapsed / weekMs) })
}

const artifactKindIconMap: Record<StudioArtifactKind, SvgIconComponent> = {
  mindmap: AccountTreeOutlinedIcon,
  report: MenuBookOutlinedIcon,
  info_graphic: ImageOutlinedIcon,
  audio_overview: GraphicEqOutlinedIcon,
  video_overview: VideocamOutlinedIcon,
  flashcard: StyleOutlinedIcon,
  quiz: QuizOutlinedIcon,
  data_table: TableChartOutlinedIcon,
  note: StickyNote2OutlinedIcon,
  slides: SlideshowOutlinedIcon,
}

const resolveListBorderTone = (
  visualStatus: StudioArtifactVisualStatus,
  kind: StudioArtifactKind,
  theme: Theme,
) => {
  const statusTone = resolveArtifactStatusTone(visualStatus, theme)
  const kindTone = resolveStudioToolTone(
    theme,
    resolveStudioToolToneKey({ artifactKind: kind }),
  )
  // Status wins for async / failure feedback; otherwise kind identity leads.
  if (
    visualStatus === 'failed' ||
    visualStatus === 'polling' ||
    visualStatus === 'queued' ||
    visualStatus === 'cancelled'
  ) {
    return { border: statusTone.border, accent: statusTone.accent, surface: kindTone.surface }
  }
  return { border: kindTone.border, accent: kindTone.accent, surface: kindTone.surface }
}

export const StudioArtifactListItem = memo(function StudioArtifactListItem({
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
  const { t } = useTranslation(['studio', 'common'])
  const statusLabelMap = getStatusLabelMap()
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
    : t('studio:artifact.meta', {
        count: sourceCount,
        relativeTime: formatArtifactRelativeTime(item.createdAt),
      })
  const KindIcon = artifactKindIconMap[item.kind] ?? AccountTreeOutlinedIcon
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
      sx={(theme) => {
        const listTone = resolveListBorderTone(visualStatus, item.kind, theme)
        return {
          position: 'relative',
          overflow: 'hidden',
          p: workspaceSpace.md,
          cursor: canPreview ? 'pointer' : 'default',
          bgcolor: listTone.surface,
          transition: workspaceTransitionPresets.interactiveColorBorder,
          borderColor: listTone.border,
          '&:hover': {
            borderColor: listTone.accent,
            backgroundColor: canPreview ? 'background.paper' : listTone.surface,
          },
          '&:active': canPreview
            ? {
                borderColor: listTone.accent,
                backgroundColor: 'action.selected',
              }
            : undefined,
          ...(previewLoading ? { borderColor: listTone.accent } : null),
        }
      }}
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
                  const kindTone = resolveStudioToolTone(
                    theme,
                    resolveStudioToolToneKey({ artifactKind: item.kind }),
                  )
                  return {
                    fontSize: workspaceIconSize.md,
                    color: isCancelled ? 'text.disabled' : kindTone.icon,
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
            <Tooltip title={t('studio:artifact.moreActions')}>
              <span>
                <IconButton
                  size="small"
                  color="default"
                  aria-label={t('studio:artifact.moreActionsAria', { title: displayTitle })}
                  onClick={(event) => {
                    event.stopPropagation()
                    setActionMenuAnchorEl(event.currentTarget)
                  }}
                >
                  <MoreHorizOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
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
                <CancelOutlinedIcon sx={actionMenuIconSx} />
                <Typography sx={actionMenuTextSx}>
                  {cancelPending ? t('studio:artifact.cancelling') : t('studio:artifact.cancel')}
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
                  <ReplayOutlinedIcon sx={actionMenuIconSx} />
                  <Typography sx={actionMenuTextSx}>
                    {retryPending ? t('common:action.retrying') : t('common:action.retry')}
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
                  <SourceOutlinedIcon sx={actionMenuIconSx} />
                  <Typography sx={actionMenuTextSx}>
                    {convertPending ? t('studio:artifact.converting') : t('studio:artifact.convertToSource')}
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
                <DeleteOutlineOutlinedIcon sx={actionMenuIconSx} />
                <Typography sx={actionMenuTextSx}>
                  {deletePending ? t('common:action.deleting') : t('common:action.delete')}
                </Typography>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  )
})
