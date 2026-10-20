import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { showAppToast } from '@/lib/apiErrorToast'
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
  const { t } = useTranslation(['sources', 'common'])
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
    } catch (err) {
      // 请求层已经提示过 API 错误；这里补上非 API 失败，同一段文案会自动去重。
      showAppToast({
        message: apiErrorMessage(err, 'sources:dialog.addFailed'),
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
            // Prefer dvh so F12 / mobile chrome shrinks the shell instead of clipping internals.
            height: 'min(620px, calc(100dvh - 32px))',
            maxHeight: 'calc(100dvh - 32px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: workspaceDialogLayout.titlePaddingBottom,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('sources:dialog.title')}</Typography>
          <IconButton size="small" onClick={handleDialogClose} disabled={disabled} aria-label={t('sources:dialog.closeAria')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          pt: workspaceDialogLayout.contentPaddingTop,
          pb: workspaceSpace.md,
          flex: 1,
          minHeight: 0,
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
    </Dialog>
  )
}
