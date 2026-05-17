import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'

interface CreateNotebookDialogProps {
  open: boolean
  draftName: string
  submitting: boolean
  errorMessage: string | null
  onDraftNameChange: (value: string) => void
  onClose: () => void
  onCreateWithName: () => void
}

export function CreateNotebookDialog({
  open,
  draftName,
  submitting,
  errorMessage,
  onDraftNameChange,
  onClose,
  onCreateWithName,
}: CreateNotebookDialogProps) {
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>新建笔记本</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          margin="dense"
          label="笔记本名称（可选）"
          value={draftName}
          onChange={(event) => onDraftNameChange(event.target.value)}
          disabled={submitting}
        />
        {errorMessage ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorMessage}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={onCreateWithName}
          disabled={submitting}
        >
          创建
        </Button>
      </DialogActions>
    </Dialog>
  )
}
