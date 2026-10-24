import { useState } from 'react'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { updateNotebook } from '../../../api/notebook'
import { ApiError } from '../../../lib/http'
import type { Notebook, UpdateNotebookRequest } from '../../../types/api'
import { workspaceDialogLayout } from '../shared/ui/dialogLayoutTokens'
import { workspaceSpace } from '../shared/ui/layoutTokens'
import { workspaceIconSize } from '../shared/ui/typeTokens'

const MAX_NAME_LENGTH = 128
const MAX_DESCRIPTION_LENGTH = 1024

export interface CustomizeNotebookSavedState {
  name: string
  desc: string
  customizeDescription: boolean
}

interface CustomizeNotebookDialogProps {
  notebookId: string
  open: boolean
  /** 打开时传入的当前名称，用于预填。 */
  notebookName: string
  /** 当前已落库的自定义摘要（未开启时为空）。 */
  description: string
  customizeDescription: boolean
  onClose: () => void
  onSaved: (next: CustomizeNotebookSavedState) => void
}

/**
 * 「自定义笔记本」：名称预填；摘要用右侧胶囊开关（开才能编辑），点「完成」一次提交。
 */
export function CustomizeNotebookDialog({
  notebookId,
  open,
  notebookName,
  description,
  customizeDescription,
  onClose,
  onSaved,
}: CustomizeNotebookDialogProps) {
  const { t } = useTranslation(['workspace', 'common'])
  const queryClient = useQueryClient()
  // 仅在 open 时由父级挂载，用 props 初始化即可保证名称/开关预填正确。
  const [draftName, setDraftName] = useState(() => notebookName)
  const [draftDesc, setDraftDesc] = useState(() => description)
  const [draftCustomize, setDraftCustomize] = useState(() => customizeDescription)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateNotebookRequest) => {
      await updateNotebook(notebookId, payload)
      return payload
    },
    onSuccess: (payload) => {
      const nextName = payload.name ?? draftName.trim()
      const nextCustomize = payload.customize_description ?? draftCustomize
      const nextDesc = nextCustomize ? (payload.desc ?? draftDesc.trim()) : ''

      queryClient.setQueryData<Notebook>(['notebook', notebookId], (prev) =>
        prev
          ? {
              ...prev,
              name: nextName,
              desc: nextDesc,
              flags: {
                ...prev.flags,
                customize_description: nextCustomize,
              },
            }
          : prev,
      )
      // 首页列表与详情缓存分离；改名/自定义后让列表回到时拿到新 name/desc。
      void queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
      onSaved({
        name: nextName,
        desc: nextDesc,
        customizeDescription: nextCustomize,
      })
      onClose()
    },
    onError: (error) => {
      setErrorMessage(resolveSaveErrorMessage(error, t))
    },
  })

  const isBusy = saveMutation.isPending

  const handleCustomizeToggle = (_: unknown, checked: boolean) => {
    setDraftCustomize(checked)
    setErrorMessage(null)
    if (checked && !draftDesc.trim() && description.trim()) {
      setDraftDesc(description)
    }
  }

  const handleDone = () => {
    if (isBusy) {
      return
    }

    const nextName = draftName.trim()
    if (!nextName) {
      setErrorMessage(t('workspace:customizeNotebook.name.errorRequired'))
      return
    }
    if (nextName.length > MAX_NAME_LENGTH) {
      setErrorMessage(t('workspace:customizeNotebook.name.errorTooLong'))
      return
    }

    const nextDesc = draftDesc.trim()
    if (draftCustomize && !nextDesc) {
      setErrorMessage(t('workspace:customizeNotebook.description.error.invalid'))
      return
    }

    const payload: UpdateNotebookRequest = {}
    if (nextName !== notebookName.trim()) {
      payload.name = nextName
    }

    const customizeChanged = draftCustomize !== customizeDescription
    const descChanged = draftCustomize && nextDesc !== description.trim()
    if (customizeChanged || descChanged) {
      if (draftCustomize) {
        payload.customize_description = true
        payload.desc = nextDesc
      } else {
        payload.customize_description = false
      }
    }

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    setErrorMessage(null)
    saveMutation.mutate(payload)
  }

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
    >
      <DialogTitle>{t('workspace:customizeNotebook.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('workspace:customizeNotebook.name.label')}
            </Typography>
            <TextField
              data-testid="customize-notebook-name-input"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value.slice(0, MAX_NAME_LENGTH))}
              fullWidth
              disabled={isBusy}
              placeholder={t('workspace:customizeNotebook.name.placeholder')}
              slotProps={{
                htmlInput: {
                  maxLength: MAX_NAME_LENGTH,
                  'aria-label': t('workspace:customizeNotebook.name.label'),
                },
              }}
              sx={{ mt: workspaceDialogLayout.controlMt }}
            />
          </Box>

          <Box>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              spacing={workspaceSpace.sm}
            >
              <Stack
                direction="row"
                spacing={workspaceSpace.sm}
                sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}
              >
                <NotesRoundedIcon
                  sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary', flexShrink: 0 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                  {t('workspace:customizeNotebook.description.sectionTitle')}
                </Typography>
              </Stack>
              <Switch
                data-testid="customize-notebook-description-switch"
                color="primary"
                edge="end"
                checked={draftCustomize}
                onChange={handleCustomizeToggle}
                disabled={isBusy}
                slotProps={{
                  input: {
                    'aria-label': t('workspace:customizeNotebook.description.switchAria'),
                  },
                }}
                sx={{ flexShrink: 0 }}
              />
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: workspaceDialogLayout.helperTextMt }}
            >
              {t('workspace:customizeNotebook.description.help')}
            </Typography>
            {draftCustomize ? (
              <TextField
                data-testid="customize-notebook-description-input"
                value={draftDesc}
                onChange={(event) =>
                  setDraftDesc(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
                }
                multiline
                minRows={4}
                maxRows={10}
                fullWidth
                disabled={isBusy}
                placeholder={t('workspace:customizeNotebook.description.placeholder')}
                helperText={t('workspace:customizeNotebook.description.counter', {
                  count: draftDesc.length,
                  max: MAX_DESCRIPTION_LENGTH,
                })}
                sx={{ mt: workspaceDialogLayout.controlMt }}
              />
            ) : null}
          </Box>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: workspaceDialogLayout.contentPaddingX,
          py: workspaceSpace.md,
          gap: workspaceDialogLayout.actionsGap,
        }}
      >
        <Button
          data-testid="customize-notebook-done"
          variant="contained"
          disabled={isBusy}
          onClick={handleDone}
          sx={{ ml: 'auto' }}
        >
          {isBusy
            ? t('workspace:customizeNotebook.saving')
            : t('workspace:customizeNotebook.done')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function resolveSaveErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof ApiError) {
    if (error.code === 100002) {
      return t('workspace:customizeNotebook.name.errorInvalid')
    }
    if (error.code === 100003) {
      return t('workspace:customizeNotebook.description.error.invalid')
    }
  }
  return t('workspace:customizeNotebook.error.saveFailed')
}
