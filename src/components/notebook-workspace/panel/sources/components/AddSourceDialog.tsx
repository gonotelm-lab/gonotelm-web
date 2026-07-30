import { useMemo, useRef, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { workspaceType } from '../../../shared/ui/typeTokens'
import { workspaceDialogLayout } from '../../../shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { AddSourceDialogEditorView } from './AddSourceDialogEditorView'
import { AddSourceDialogHomeView } from './AddSourceDialogHomeView'
import {
  clampTextSourceInput,
  countTextSourceChars,
  textSourceMaxChars,
} from './textSourceLimit'

type AddSourceView = 'home' | 'url' | 'text'

interface AddSourceDialogProps {
  open: boolean
  isBusy: boolean
  onClose: () => void
  onCreateFile: (files: File[]) => Promise<void>
  onCreateUrl: (url: string) => Promise<void>
  onCreateText: (text: string) => Promise<void>
}

export function AddSourceDialog({
  open,
  isBusy,
  onClose,
  onCreateFile,
  onCreateUrl,
  onCreateText,
}: AddSourceDialogProps) {
  const [view, setView] = useState<AddSourceView>('home')
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorToast, setErrorToast] = useState<{ key: number; message: string } | null>(null)
  const errorToastKeyRef = useRef(0)

  const disabled = isBusy || submitting
  const textCharCount = useMemo(() => countTextSourceChars(textInput), [textInput])
  const hasSubmitValue = useMemo(() => {
    if (view === 'url') return urlInput.trim().length > 0
    if (view === 'text') return textInput.trim().length > 0
    return false
  }, [textInput, urlInput, view])

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0 || disabled) return
    setView('home')
    onClose()
    void onCreateFile(files)
  }

  const handleSubmit = async () => {
    if (disabled) return
    setSubmitting(true)
    try {
      if (view === 'url') {
        await onCreateUrl(urlInput.trim())
      } else if (view === 'text') {
        await onCreateText(textInput.trim())
      }
      onClose()
      setView('home')
      setUrlInput('')
      setTextInput('')
    } catch (err) {
      errorToastKeyRef.current += 1
      setErrorToast({
        key: errorToastKeyRef.current,
        message: err instanceof Error ? err.message : '添加失败，请稍后重试',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDialogClose = () => {
    if (disabled) return
    setView('home')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: workspaceRadius.lg,
            width: '760px',
            maxWidth: 'calc(100vw - 32px)',
            height: '620px',
            maxHeight: 'calc(100vh - 32px)',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: workspaceDialogLayout.titlePaddingBottom }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">添加来源</Typography>
          <IconButton size="small" onClick={handleDialogClose} disabled={disabled} aria-label="关闭">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          pt: workspaceDialogLayout.contentPaddingTop,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {view === 'home' ? (
          <AddSourceDialogHomeView
            disabled={disabled}
            onCreateFile={handleFileSelect}
            onOpenUrl={() => setView('url')}
            onOpenText={() => setView('text')}
          />
        ) : (
          <AddSourceDialogEditorView
            view={view}
            disabled={disabled}
            urlInput={urlInput}
            textInput={textInput}
            textMaxChars={textSourceMaxChars}
            textCharCount={textCharCount}
            hasSubmitValue={hasSubmitValue}
            onBack={() => setView('home')}
            onUrlChange={setUrlInput}
            onTextChange={(value) => {
              setTextInput(clampTextSourceInput(value))
            }}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
      <Snackbar
        key={errorToast?.key}
        open={Boolean(errorToast)}
        autoHideDuration={2400}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return
          }
          setErrorToast(null)
        }}
      >
        <Paper
          elevation={2}
          sx={{
            px: workspaceSpace.md,
            py: workspaceSpace.xxs,
            borderRadius: workspaceRadius.md,
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: 'primary.dark',
            maxWidth: 420,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontSize: workspaceType.xs,
              lineHeight: 1.35,
              color: 'background.default',
            }}
          >
            {errorToast?.message ?? ''}
          </Typography>
        </Paper>
      </Snackbar>
    </Dialog>
  )
}
