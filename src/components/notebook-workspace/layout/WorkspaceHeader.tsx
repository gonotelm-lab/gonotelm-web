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
          px: { xs: 0.75, md: 1 },
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <IconButton
          component={Link}
          to="/"
          edge="start"
          color="inherit"
          size="small"
          aria-label="返回"
          sx={{ ml: 0, p: 0.5 }}
        >
          <ArrowBackIcon sx={{ fontSize: '0.95rem' }} />
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
            px: 1.1,
            py: 0.25,
            borderRadius: 1,
            cursor: 'text',
            fontSize: '0.95rem',
            lineHeight: 1.35,
            fontWeight: 500,
            '& input': {
              cursor: 'text',
              textOverflow: 'ellipsis',
            },
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '&.Mui-focused': {
              bgcolor: 'action.selected',
            },
          }}
        />
        <Box
          sx={{
            ml: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <IconButton
            size="small"
            aria-label="删除笔记本"
            onClick={handleOpenDeleteDialog}
            disabled={!canDelete || isDeletingNotebook}
            sx={{ p: 0.5 }}
          >
            <DeleteIcon sx={{ fontSize: '1rem' }} />
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
            <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
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
            color="error"
            onClick={handleConfirmDelete}
            disabled={isDeletingNotebook}
          >
            {isDeletingNotebook ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
