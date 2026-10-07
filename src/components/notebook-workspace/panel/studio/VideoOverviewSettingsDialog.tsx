import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { GenerateVideoOverviewParameters } from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { StylePreviewPicker } from './components/StylePreviewPicker'
import { useStudioStylePreviews } from './hooks/useStudioStylePreviews'
import {
  getDefaultVideoOverviewParameters,
  getVideoOverviewLanguageOptionList,
  getVideoOverviewVisualStyleOptionListFromPreviews,
  resolveVideoOverviewVisualStyle,
  VIDEO_OVERVIEW_STYLE_PREVIEW_KIND,
} from './videoOverviewSettings'

interface VideoOverviewSettingsDialogProps {
  open: boolean
  initialParams: GenerateVideoOverviewParameters
  onClose: () => void
  onGenerate: (params: GenerateVideoOverviewParameters) => void
}

export const VideoOverviewSettingsDialog = memo(function VideoOverviewSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: VideoOverviewSettingsDialogProps) {
  const { t } = useTranslation(['studio', 'common'])
  const [draftParams, setDraftParams] = useState<GenerateVideoOverviewParameters>(initialParams)
  const languageOptionList = getVideoOverviewLanguageOptionList()
  // Fetched only once this dialog opens. The backend is the source of truth for
  // styles + preview art; a failed or empty response resolves to the hardcoded
  // option list.
  const { data: stylePreviews } = useStudioStylePreviews(VIDEO_OVERVIEW_STYLE_PREVIEW_KIND, {
    enabled: open,
  })
  const visualStyleOptionList = useMemo(
    () => getVideoOverviewVisualStyleOptionListFromPreviews(stylePreviews),
    [stylePreviews],
  )

  const defaults = getDefaultVideoOverviewParameters()
  const language = draftParams.language || defaults.language
  const visualStyle = resolveVideoOverviewVisualStyle(
    visualStyleOptionList,
    draftParams.visual_style,
    stylePreviews?.default_visual_style,
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>{t('studio:settings.videoOverview.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.language')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.languageHelp.videoOverview')}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={language}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, language: event.target.value }))
              }
              sx={{ mt: workspaceDialogLayout.controlMt }}
            >
              {languageOptionList.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.visualStyle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.visualStyleHelp.videoOverview')}
            </Typography>
            <StylePreviewPicker
              value={visualStyle}
              options={visualStyleOptionList}
              onChange={(nextValue) =>
                setDraftParams((prev) => ({ ...prev, visual_style: nextValue }))
              }
              ariaLabel={t('studio:settings.visualStyle')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {visualStyleOptionList.find((option) => option.value === visualStyle)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.tip')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.tipHelp.videoOverview')}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={3}
              maxRows={3}
              slotProps={{ htmlInput: { maxLength: 300 } }}
              placeholder={t('studio:settings.tipPlaceholder.videoOverview')}
              value={draftParams.tip || ''}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, tip: event.target.value }))
              }
              sx={{ mt: workspaceDialogLayout.controlMt }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:action.cancel')}</Button>
        <Button
          variant="contained"
          onClick={() => onGenerate({ ...draftParams, visual_style: visualStyle })}
        >
          {t('common:action.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
})
