import { useState } from 'react'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
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
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize, workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

interface InvalidFavouriteNotebookCardProps {
  onDelete: () => Promise<void>
  deleting?: boolean
  /** 批量模式：整卡可点选，隐藏右上角菜单。 */
  batchMode?: boolean
  onBatchToggle?: () => void
  deleteActionLabel: string
  deleteDialogTitle: string
  deleteDialogBody: string
}

/**
 * 收藏夹内失效笔记本占位卡：浅灰底 +「已失效」，删除走与 NotebookCard 相同的右上角菜单。
 */
export function InvalidFavouriteNotebookCard({
  onDelete,
  deleting = false,
  batchMode = false,
  onBatchToggle,
  deleteActionLabel,
  deleteDialogTitle,
  deleteDialogBody,
}: InvalidFavouriteNotebookCardProps) {
  const { t } = useTranslation(['favourites', 'common', 'home'])
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const actionMenuOpen = Boolean(actionAnchorEl)

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setActionAnchorEl(event.currentTarget)
  }

  const handleCloseActionMenu = () => {
    setActionAnchorEl(null)
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

  const body = (
    <Stack
      sx={{
        minHeight: 136,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        rowGap: workspaceLayout.listRowGap,
        alignItems: 'stretch',
        px: workspaceSpace.md,
        py: workspaceSpace.md,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          color: 'text.disabled',
          minWidth: 0,
          pr: batchMode ? 0 : workspaceSpace.lg,
        }}
      >
        <LinkOffOutlinedIcon
          aria-hidden
          sx={{ fontSize: workspaceIconSize.md, flexShrink: 0 }}
        />
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            letterSpacing: 0,
            lineHeight: 1.3,
            color: 'text.secondary',
          }}
        >
          {t('favourites:detail.invalid')}
        </Typography>
      </Stack>
      <Box />
    </Stack>
  )

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        minHeight: 168,
        borderRadius: workspaceRadius.lg,
        borderColor: 'divider',
        bgcolor: (theme) =>
          alpha(
            theme.palette.text.primary,
            theme.palette.mode === 'dark' ? 0.12 : 0.04,
          ),
        boxShadow: 'none',
      }}
    >
      {batchMode ? (
        <CardActionArea
          onClick={onBatchToggle}
          disabled={deleting}
          sx={{ height: '100%', alignItems: 'stretch' }}
        >
          {body}
        </CardActionArea>
      ) : (
        body
      )}

      {!batchMode ? (
        <IconButton
          size="small"
          aria-label={t('home:card.actionsAria')}
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
      ) : null}

      {!batchMode ? (
        <Menu
          anchorEl={actionAnchorEl}
          open={actionMenuOpen}
          onClose={handleCloseActionMenu}
          onClick={(event) => event.stopPropagation()}
        >
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
              {deleteActionLabel}
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
        <DialogTitle>{deleteDialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteDialogBody}
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
            {deleting ? t('common:action.deleting') : deleteActionLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
