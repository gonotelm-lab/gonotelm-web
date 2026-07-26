import { useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { workspaceRadius, workspaceSpace } from '../shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../shared/ui/motionTokens'
import { workspaceIconSize, workspaceTypeRem } from '../shared/ui/typeTokens'

interface WorkspaceHeaderProps {
  notebookName: string
  isFetching: boolean
  isUpdatingName: boolean
  isDeletingNotebook?: boolean
  onNotebookNameChange: (value: string) => void
  onNotebookNameFocus: () => void
  onNotebookNameBlur: () => void
  onDeleteNotebook?: () => Promise<void>
}

export function WorkspaceHeader({
  notebookName,
  isFetching,
  isUpdatingName,
  isDeletingNotebook = false,
  onNotebookNameChange,
  onNotebookNameFocus,
  onNotebookNameBlur,
  onDeleteNotebook,
}: WorkspaceHeaderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const canDelete = typeof onDeleteNotebook === 'function'

  const handleOpenDeleteDialog = () => {
    if (!canDelete) {
      return
    }
    setDeleteErrorMessage(null)
    setDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    if (isDeletingNotebook) {
      return
    }
    setDeleteErrorMessage(null)
    setDeleteDialogOpen(false)
  }

  const handleConfirmDelete = () => {
    if (!onDeleteNotebook || isDeletingNotebook) {
      return
    }
    setDeleteErrorMessage(null)
    void onDeleteNotebook()
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
    <Box
      component="header"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: '100%',
          px: { xs: workspaceSpace.sm, md: workspaceSpace.sm },
          py: workspaceSpace.xxs,
          display: 'flex',
          alignItems: 'center',
          gap: workspaceSpace.xxs,
        }}
      >
        <IconButton
          component={Link}
          to="/"
          edge="start"
          color="inherit"
          size="small"
          aria-label="返回"
          sx={{ ml: 0, p: workspaceSpace.xxs }}
        >
          <ArrowBackIcon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
        <InputBase
          value={notebookName}
          placeholder="Untitled notebook"
          disabled={isDeletingNotebook}
          onChange={(event) => onNotebookNameChange(event.target.value)}
          onFocus={onNotebookNameFocus}
          onBlur={onNotebookNameBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const input = event.target as HTMLInputElement
              input.blur()
            }
          }}
          inputProps={{
            'aria-label': '笔记名称',
            maxLength: 128,
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: { xs: '100%', md: 560 },
            px: workspaceSpace.sm,
            py: workspaceSpace.xxs,
            borderRadius: workspaceRadius.md,
            border: 1,
            borderColor: 'transparent',
            bgcolor: 'background.paper',
            cursor: 'text',
            fontSize: workspaceTypeRem.lg,
            lineHeight: 1.35,
            fontWeight: 600,
            transition: workspaceTransitionPresets.borderBg,
            '& input': {
              cursor: 'text',
              textOverflow: 'ellipsis',
            },
            '&:hover': {
              bgcolor: 'background.default',
              borderColor: 'divider',
            },
            '&.Mui-focused': {
              bgcolor: 'action.selected',
              borderColor: 'primary.main',
            },
          }}
        />
        <Box
          sx={{
            ml: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: workspaceSpace.xxs,
            flexShrink: 0,
          }}
        >
          <IconButton
            size="small"
            aria-label="删除笔记本"
            onClick={handleOpenDeleteDialog}
            disabled={!canDelete || isDeletingNotebook}
            sx={{ p: workspaceSpace.xxs }}
          >
            <DeleteIcon sx={{ fontSize: workspaceIconSize.md }} />
          </IconButton>
          {(isFetching || isUpdatingName || isDeletingNotebook) && <CircularProgress size={16} />}
        </Box>
      </Box>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>删除笔记本</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            删除后将移除该笔记本及其相关聊天与来源数据，此操作不可恢复。
          </Typography>
          {deleteErrorMessage ? (
            <Typography
              variant="caption"
              sx={(theme) => ({
                mt: 1,
                display: 'block',
                color: theme.workspacePalette.status.error,
              })}
            >
              {deleteErrorMessage}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeletingNotebook}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={isDeletingNotebook}
            sx={(theme) => ({
              bgcolor: theme.workspacePalette.status.error,
              '&:hover': {
                bgcolor: theme.palette.error.dark,
              },
            })}
          >
            {isDeletingNotebook ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
