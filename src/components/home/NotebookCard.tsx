import { useState } from 'react'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import {
  Avatar,
  Button,
  Box,
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
  description: string
  dateLabel: string
  sourceCount: number
  /** 共享列表里展示分享者；owned 列表不传。 */
  owner?: NotebookCardOwner
  onOpen: () => void
  onDelete?: () => Promise<void>
  deleting?: boolean
}

export function NotebookCard({
  title,
  description,
  dateLabel,
  sourceCount,
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
  const showOwner = Boolean(owner) && !canDelete
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
            gridTemplateRows: 'auto minmax(0, 2.4em) minmax(0, 2.75em) auto',
            rowGap: workspaceLayout.listRowGap,
            alignItems: 'start',
          }}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: workspaceRadius.md,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                color: 'primary.main',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <MenuBookOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
            </Box>
            {showOwner && owner ? (
              <Tooltip title={owner.nickname} placement="top">
                <Avatar
                  src={owner.avatarUrl?.trim() || undefined}
                  alt=""
                  aria-label={t('home:card.sharedBy', { nickname: owner.nickname })}
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
            ) : (
              <Box sx={{ width: 28, height: 28, flexShrink: 0, visibility: canDelete ? 'hidden' : 'visible' }} />
            )}
          </Stack>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontStyle: 'normal',
              letterSpacing: 0,
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.35,
            }}
          >
            {description}
          </Typography>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 500,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {t('common:sourceCount', { count: sourceCount })}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                pl: workspaceSpace.sm,
              }}
            >
              {dateLabel}
            </Typography>
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
