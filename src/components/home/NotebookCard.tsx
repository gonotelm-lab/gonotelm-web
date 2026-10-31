import { useState } from 'react'
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined'
import BookmarkRemoveOutlinedIcon from '@mui/icons-material/BookmarkRemoveOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '../../lib/apiErrorMessage'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import {
  workspaceInteraction,
  workspaceMotion,
  workspaceTransitionPresets,
} from '../notebook-workspace/shared/ui/motionTokens'
import { workspaceIconSize, workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

export interface NotebookCardOwner {
  nickname: string
  avatarUrl: string
}

interface NotebookCardProps {
  title: string
  dateLabel: string
  sourceCount: number
  /** 公开笔记本：卡片右下角补充指向性图标。 */
  isPublic?: boolean
  /** owned 卡片在 owner 空位上展示的 emoji；由 notebookId 确定性映射；有封面时不展示。 */
  emoji?: string
  /** 已设置封面：整卡以封面为背景，文字压在渐变遮罩上。 */
  coverUrl?: string
  /** 共享列表里展示分享者；owned 列表不传。 */
  owner?: NotebookCardOwner
  onOpen: () => void
  onDelete?: () => Promise<void>
  /** 覆盖菜单里删除项文案（例如收藏夹内用「移出收藏夹」）。 */
  deleteActionLabel?: string
  /** 覆盖默认「删除笔记本」确认文案（例如收藏夹内删除=移出）。 */
  deleteDialogTitle?: string
  deleteDialogBody?: string
  onPin?: () => Promise<void>
  onUnpin?: () => Promise<void>
  /** 首页 / 工作区：打开「加入收藏夹」对话框。 */
  onAddToFavourite?: () => void
  /** 夹内页：从当前收藏夹移出。 */
  onRemoveFromFavourite?: () => Promise<void>
  deleting?: boolean
  pinning?: boolean
  removingFromFavourite?: boolean
  /** 置顶额度已满：仍展示「置顶」入口，但禁用并提示。 */
  pinDisabled?: boolean
}

export function NotebookCard({
  title,
  dateLabel,
  sourceCount,
  isPublic = false,
  emoji,
  coverUrl,
  owner,
  onOpen,
  onDelete,
  deleteActionLabel,
  deleteDialogTitle,
  deleteDialogBody,
  onPin,
  onUnpin,
  onAddToFavourite,
  onRemoveFromFavourite,
  deleting = false,
  pinning = false,
  removingFromFavourite = false,
  pinDisabled = false,
}: NotebookCardProps) {
  const { t } = useTranslation(['home', 'common', 'favourites'])
  const hasCover = Boolean(coverUrl)
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const actionMenuOpen = Boolean(actionAnchorEl)
  const canDelete = typeof onDelete === 'function'
  const canPin = typeof onPin === 'function'
  const canUnpin = typeof onUnpin === 'function'
  const canAddToFavourite = typeof onAddToFavourite === 'function'
  const canRemoveFromFavourite = typeof onRemoveFromFavourite === 'function'
  const hasActions =
    canDelete || canPin || canUnpin || canAddToFavourite || canRemoveFromFavourite
  const actionsBusy = deleting || pinning || removingFromFavourite
  const pinActionDisabled = actionsBusy || pinDisabled
  const ownerInitial = owner
    ? (Array.from(owner.nickname.trim())[0]?.toUpperCase() ?? '?')
    : ''

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setActionAnchorEl(event.currentTarget)
  }

  const handleCloseActionMenu = () => {
    setActionAnchorEl(null)
  }

  const handlePin = () => {
    handleCloseActionMenu()
    if (!onPin || pinActionDisabled) {
      return
    }
    void onPin()
  }

  const handleUnpin = () => {
    handleCloseActionMenu()
    if (!onUnpin || actionsBusy) {
      return
    }
    void onUnpin()
  }

  const handleAddToFavourite = () => {
    handleCloseActionMenu()
    if (!onAddToFavourite || actionsBusy) {
      return
    }
    onAddToFavourite()
  }

  const handleRemoveFromFavourite = () => {
    handleCloseActionMenu()
    if (!onRemoveFromFavourite || actionsBusy) {
      return
    }
    void onRemoveFromFavourite()
  }

  const handleOpenDeleteDialog = () => {
    handleCloseActionMenu()
    if (!canDelete) {
      return
    }
    setDeleteErrorMessage(null)
    setDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    if (deleting) {
      return
    }
    setDeleteErrorMessage(null)
    setDeleteDialogOpen(false)
  }

  const handleConfirmDelete = () => {
    if (!onDelete || deleting) {
      return
    }
    setDeleteErrorMessage(null)
    void onDelete()
      .then(() => {
        setDeleteDialogOpen(false)
      })
      .catch((error) => {
        setDeleteErrorMessage(
          apiErrorMessage(error, 'common:error.deleteFailed'),
        )
      })
  }

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        minHeight: 168,
        borderRadius: workspaceRadius.lg,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        transition: workspaceTransitionPresets.cardLift,
        '&:hover': actionsBusy
          ? undefined
          : {
              borderColor: 'primary.main',
              // hover 时封面轻微放大；非封面卡片没有该目标，不受影响。
              '& .notebook-card-cover': {
                transform: 'scale(1.04)',
              },
            },
        // 尊重系统的减少动态偏好：只保留边框反馈，不做缩放。
        [workspaceInteraction.reducedMotionQuery]: {
          '&:hover .notebook-card-cover': {
            transform: 'none',
          },
        },
      }}
    >
      {coverUrl ? (
        /* 封面背景层：整卡铺满 + 底部渐变遮罩保证文字可读；on-image 配色用 common.black/white 派生。 */
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Box
            component="img"
            src={coverUrl}
            alt=""
            loading="lazy"
            className="notebook-card-cover"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: 'scale(1)',
              transition: `transform ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              [workspaceInteraction.reducedMotionQuery]: {
                transition: 'none',
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: (theme) =>
                `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.16)} 0%, ${alpha(
                  theme.palette.common.black,
                  0.58,
                )} 100%)`,
            }}
          />
        </Box>
      ) : null}
      <CardActionArea
        onClick={onOpen}
        disabled={actionsBusy}
        sx={{
          px: workspaceSpace.md,
          py: workspaceSpace.md,
          height: '100%',
          cursor: actionsBusy ? 'default' : workspaceInteraction.cursorPointer,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack
          sx={{
            minHeight: 136,
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            rowGap: workspaceLayout.listRowGap,
            alignItems: 'stretch',
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: workspaceSpace.sm, minWidth: 0, pr: workspaceSpace.lg }}
          >
            {owner ? (
              <>
                <Tooltip
                  title={canDelete ? owner.nickname : t('home:card.sharedBy', { nickname: owner.nickname })}
                  placement="top"
                >
                  <Avatar
                    src={owner.avatarUrl?.trim() || undefined}
                    alt=""
                    aria-label={
                      canDelete
                        ? owner.nickname
                        : t('home:card.sharedBy', { nickname: owner.nickname })
                    }
                    sx={{
                      width: 24,
                      height: 24,
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontSize: workspaceType.xs,
                      fontWeight: 600,
                    }}
                  >
                    {ownerInitial}
                  </Avatar>
                </Tooltip>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    minWidth: 0,
                    fontWeight: 500,
                    letterSpacing: 0,
                    // 封面背景上压白字，保持可读性。
                    color: hasCover
                      ? (theme) => alpha(theme.palette.common.white, 0.92)
                      : 'text.secondary',
                  }}
                >
                  {owner.nickname}
                </Typography>
              </>
            ) : coverUrl || emoji ? (
              /* owned 卡片没有 owner 行：emoji 只作为 no-cover 的占位字形。
                 有封面时隐藏 emoji，但保留同尺寸空位，避免标题相对无封面卡片上移。 */
              <Box
                aria-hidden
                sx={{
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  fontSize: 24,
                  lineHeight: 1,
                }}
              >
                {coverUrl ? null : emoji}
              </Box>
            ) : null}
          </Stack>
          {/* 标题相对 owner 行与 meta 行垂直居中（参考稿里标题压在中段）。 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              minHeight: 0,
              pr: workspaceSpace.lg,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontStyle: 'normal',
                letterSpacing: 0,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                color: hasCover ? 'common.white' : 'text.primary',
              }}
            >
              {title}
            </Typography>
          </Box>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center', minWidth: 0, alignSelf: 'stretch' }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: hasCover
                  ? (theme) => alpha(theme.palette.common.white, 0.85)
                  : 'text.secondary',
              }}
            >
              {dateLabel} · {t('common:sourceCount', { count: sourceCount })}
            </Typography>
            {isPublic ? (
              <Tooltip title={t('home:card.publicAria')} placement="top">
                <PublicOutlinedIcon
                  aria-label={t('home:card.publicAria')}
                  sx={{
                    fontSize: workspaceIconSize.sm,
                    flexShrink: 0,
                    color: hasCover ? 'common.white' : 'primary.main',
                  }}
                />
              </Tooltip>
            ) : null}
          </Stack>
        </Stack>
      </CardActionArea>
      {hasActions ? (
        <IconButton
          size="small"
          aria-label={t('home:card.actionsAria')}
          onClick={handleOpenActionMenu}
          disabled={actionsBusy}
          sx={{
            position: 'absolute',
            top: 8,
            right: 4,
            // 必须高于 CardActionArea(zIndex:1)，否则整卡点击层会吃掉菜单点击。
            zIndex: 2,
            color: hasCover ? 'common.white' : undefined,
          }}
        >
          <MoreVertOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
      ) : null}
      {hasActions ? (
        <Menu
          anchorEl={actionAnchorEl}
          open={actionMenuOpen}
          onClose={handleCloseActionMenu}
          onClick={(event) => event.stopPropagation()}
        >
          {canPin ? (
            <Tooltip
              title={pinDisabled ? t('common:apiError.pinLimit') : ''}
              placement="left"
              disableHoverListener={!pinDisabled}
            >
              <Box component="span" sx={{ display: 'block' }}>
                <MenuItem
                  onClick={handlePin}
                  disabled={pinActionDisabled}
                  sx={{
                    minHeight: 34,
                    px: workspaceSpace.md,
                    gap: workspaceLayout.listInlineGap,
                  }}
                >
                  <PushPinOutlinedIcon
                    sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }}
                  />
                  <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
                    {t('home:card.pin')}
                  </Typography>
                </MenuItem>
              </Box>
            </Tooltip>
          ) : null}
          {canUnpin ? (
            <MenuItem
              onClick={handleUnpin}
              disabled={actionsBusy}
              sx={{
                minHeight: 34,
                px: workspaceSpace.md,
                gap: workspaceLayout.listInlineGap,
              }}
            >
              <PushPinOutlinedIcon sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
                {t('home:card.unpin')}
              </Typography>
            </MenuItem>
          ) : null}
          {canAddToFavourite ? (
            <MenuItem
              onClick={handleAddToFavourite}
              disabled={actionsBusy}
              sx={{
                minHeight: 34,
                px: workspaceSpace.md,
                gap: workspaceLayout.listInlineGap,
              }}
            >
              <BookmarkBorderOutlinedIcon
                sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }}
              />
              <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
                {t('home:card.addToFavourite')}
              </Typography>
            </MenuItem>
          ) : null}
          {canRemoveFromFavourite ? (
            <MenuItem
              onClick={handleRemoveFromFavourite}
              disabled={actionsBusy}
              sx={{
                minHeight: 34,
                px: workspaceSpace.md,
                gap: workspaceLayout.listInlineGap,
              }}
            >
              <BookmarkRemoveOutlinedIcon
                sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }}
              />
              <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
                {t('favourites:detail.remove')}
              </Typography>
            </MenuItem>
          ) : null}
          {canDelete ? (
            <MenuItem
              onClick={handleOpenDeleteDialog}
              disabled={actionsBusy}
              sx={{
                minHeight: 34,
                px: workspaceSpace.md,
                gap: workspaceLayout.listInlineGap,
              }}
            >
              <DeleteOutlinedIcon sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
                {deleteActionLabel ?? t('common:action.delete')}
              </Typography>
            </MenuItem>
          ) : null}
        </Menu>
      ) : null}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
      >
        <DialogTitle>{deleteDialogTitle ?? t('home:card.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteDialogBody ?? t('home:card.deleteBody')}
          </Typography>
          {deleteErrorMessage ? (
            <Typography
              variant="caption"
              color="error.main"
              sx={{ mt: workspaceSpace.sm, display: 'block' }}
            >
              {deleteErrorMessage}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            {t('common:action.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting
              ? t('common:action.deleting')
              : (deleteActionLabel ?? t('common:action.delete'))}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
