import { useState } from 'react'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
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
  Typography,
} from '@mui/material'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceInteraction } from '../notebook-workspace/shared/ui/motionTokens'
import { workspaceIconSize, workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

interface NotebookCardProps {
  title: string
  description: string
  dateLabel: string
  sourceCount: number
  onOpen: () => void
  onDelete?: () => Promise<void>
  deleting?: boolean
}

export function NotebookCard({
  title,
  description,
  dateLabel,
  sourceCount,
  onOpen,
  onDelete,
  deleting = false,
}: NotebookCardProps) {
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const actionMenuOpen = Boolean(actionAnchorEl)
  const canDelete = typeof onDelete === 'function'

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
        if (error instanceof Error && error.message.trim()) {
          setDeleteErrorMessage(error.message)
          return
        }
        setDeleteErrorMessage('删除失败，请稍后重试')
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
        bgcolor: '#fbfcff',
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
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'start', minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: workspaceRadius.md,
                bgcolor: '#d9edff',
                display: 'grid',
                placeItems: 'center',
                fontSize: workspaceIconSize.md,
                flexShrink: 0,
              }}
            >
              📘
            </Box>
            <Box sx={{ width: 28, height: 28, flexShrink: 0, visibility: canDelete ? 'hidden' : 'visible' }} />
          </Stack>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
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
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              {sourceCount} sources
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: 'nowrap', pl: workspaceSpace.sm }}
            >
              {dateLabel}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
      {canDelete ? (
        <IconButton
          size="small"
          aria-label="笔记本操作"
          onClick={handleOpenActionMenu}
          disabled={deleting}
          sx={{
            position: 'absolute',
            top: 8,
            right: 4,
          }}
        >
          <MoreVertIcon sx={{ fontSize: workspaceIconSize.md }} />
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
          <DeleteIcon sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: workspaceType.xs, lineHeight: 1.2 }}>删除</Typography>
        </MenuItem>
      </Menu>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
      >
        <DialogTitle>删除笔记本</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            删除后将移除该笔记本及其相关聊天与来源数据，此操作不可恢复。
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
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
