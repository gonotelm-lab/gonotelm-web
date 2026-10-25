import { useState } from 'react'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
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
  /** owned 卡片在 owner 空位上展示的 emoji；由 notebookId 确定性映射。 */
  emoji?: string
  /** 共享列表里展示分享者；owned 列表不传。 */
  owner?: NotebookCardOwner
  onOpen: () => void
  onDelete?: () => Promise<void>
  deleting?: boolean
}

export function NotebookCard({
  title,
  dateLabel,
  sourceCount,
  isPublic = false,
  emoji,
  owner,
  onOpen,
  onDelete,
  deleting = false,
}: NotebookCardProps) {
  const { t } = useTranslation(['home', 'common'])
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const actionMenuOpen = Boolean(actionAnchorEl)
  const canDelete = typeof onDelete === 'function'
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
        '&:hover': deleting
          ? undefined
          : {
              borderColor: 'primary.main',
            },
      }}
    >
      <CardActionArea
        onClick={onOpen}
        disabled={deleting}
        sx={{
          px: workspaceSpace.md,
          py: workspaceSpace.md,
          height: '100%',
          cursor: deleting ? 'default' : workspaceInteraction.cursorPointer,
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
                  color="text.secondary"
                  noWrap
                  sx={{ minWidth: 0, fontWeight: 500, letterSpacing: 0 }}
                >
                  {owner.nickname}
                </Typography>
              </>
            ) : (
              /* owned 卡片没有 owner 行：放 notebookId hash 出来的 emoji，顶部不空荡；纯字形，不加底色也不加边框。 */
              emoji ? (
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
                  {emoji}
                </Box>
              ) : null
            )}
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
              color="text.secondary"
              sx={{
                fontWeight: 500,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {dateLabel} · {t('common:sourceCount', { count: sourceCount })}
            </Typography>
            {isPublic ? (
              <Tooltip title={t('home:card.publicAria')} placement="top">
                <PublicOutlinedIcon
                  aria-label={t('home:card.publicAria')}
                  sx={{ fontSize: workspaceIconSize.sm, color: 'primary.main', flexShrink: 0 }}
                />
              </Tooltip>
            ) : null}
          </Stack>
        </Stack>
      </CardActionArea>
      {canDelete ? (
        <IconButton
          size="small"
          aria-label={t('home:card.actionsAria')}
          onClick={handleOpenActionMenu}
          disabled={deleting}
          sx={{
            position: 'absolute',
            top: 8,
            right: 4,
          }}
        >
          <MoreVertOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
      ) : null}
      {canDelete ? (
        <Menu
          anchorEl={actionAnchorEl}
          open={actionMenuOpen}
          onClose={handleCloseActionMenu}
          onClick={(event) => event.stopPropagation()}
        >
          <MenuItem
            onClick={handleOpenDeleteDialog}
            disabled={!canDelete || deleting}
            sx={{
              minHeight: 34,
              px: workspaceSpace.md,
              gap: workspaceLayout.listInlineGap,
            }}
          >
            <DeleteOutlinedIcon sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
              {t('common:action.delete')}
            </Typography>
          </MenuItem>
        </Menu>
      ) : null}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
      >
        <DialogTitle>{t('home:card.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('home:card.deleteBody')}
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
            {deleting ? t('common:action.deleting') : t('common:action.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
