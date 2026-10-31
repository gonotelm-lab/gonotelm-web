import { useState } from 'react'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DriveFileRenameOutlineOutlinedIcon from '@mui/icons-material/DriveFileRenameOutlineOutlined'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import {
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
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { getNotebookEmoji } from '@/lib/notebookEmoji'
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

interface FavouriteCardProps {
  id: string
  title: string
  dateLabel: string
  notebookCount: number
  onOpen: () => void
  onRename: () => void
  onDelete: () => Promise<void>
  deleting?: boolean
}

/**
 * 收藏夹卡片：布局与 NotebookCard 对齐（顶 emoji / 中标题 / 底 meta + 右上菜单），
 * 保证首页与收藏列表视觉同一套卡片语言。
 */
export function FavouriteCard({
  id,
  title,
  dateLabel,
  notebookCount,
  onOpen,
  onRename,
  onDelete,
  deleting = false,
}: FavouriteCardProps) {
  const { t } = useTranslation(['favourites', 'common'])
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const actionMenuOpen = Boolean(actionAnchorEl)
  const emoji = getNotebookEmoji(id)

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setActionAnchorEl(event.currentTarget)
  }

  const handleCloseActionMenu = () => {
    setActionAnchorEl(null)
  }

  const handleRename = () => {
    handleCloseActionMenu()
    if (deleting) return
    onRename()
  }

  const handleOpenDeleteDialog = () => {
    handleCloseActionMenu()
    if (deleting) return
    setDeleteErrorMessage(null)
    setDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    if (deleting) return
    setDeleteErrorMessage(null)
    setDeleteDialogOpen(false)
  }

  const handleConfirmDelete = () => {
    if (deleting) return
    setDeleteErrorMessage(null)
    void onDelete()
      .then(() => {
        setDeleteDialogOpen(false)
      })
      .catch((error) => {
        setDeleteErrorMessage(apiErrorMessage(error, 'common:error.deleteFailed'))
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
            sx={{
              alignItems: 'center',
              gap: workspaceSpace.sm,
              minWidth: 0,
              pr: workspaceSpace.lg,
            }}
          >
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
          </Stack>
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
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          </Box>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              minWidth: 0,
              alignSelf: 'stretch',
            }}
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
                color: 'text.secondary',
              }}
            >
              {dateLabel} ·{' '}
              {t('favourites:list.notebookCount', { count: notebookCount })}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
      <IconButton
        size="small"
        aria-label={t('favourites:list.actionsAria')}
        onClick={handleOpenActionMenu}
        disabled={deleting}
        sx={{
          position: 'absolute',
          top: 8,
          right: 4,
          zIndex: 2,
        }}
      >
        <MoreVertOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
      </IconButton>
      <Menu
        anchorEl={actionAnchorEl}
        open={actionMenuOpen}
        onClose={handleCloseActionMenu}
        onClick={(event) => event.stopPropagation()}
      >
        <MenuItem
          onClick={handleRename}
          disabled={deleting}
          sx={{
            minHeight: 34,
            px: workspaceSpace.md,
            gap: workspaceLayout.listInlineGap,
          }}
        >
          <DriveFileRenameOutlineOutlinedIcon
            sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }}
          />
          <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>
            {t('favourites:list.rename')}
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={handleOpenDeleteDialog}
          disabled={deleting}
          sx={{
            minHeight: 34,
            px: workspaceSpace.md,
            gap: workspaceLayout.listInlineGap,
          }}
        >
          <DeleteOutlinedIcon
            sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }}
          />
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
        <DialogTitle>{t('favourites:list.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('favourites:list.deleteBody')}
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
