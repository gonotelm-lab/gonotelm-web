import { useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { workspaceRadius } from '../../../shared/ui/layoutTokens'
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
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">添加来源</Typography>
          <IconButton size="small" onClick={handleDialogClose} disabled={disabled} aria-label="关闭">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
    </Dialog>
  )
}
