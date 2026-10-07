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
import type { GenerateSlidesParameters } from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { StylePreviewPicker } from './components/StylePreviewPicker'
import { useStudioStylePreviews } from './hooks/useStudioStylePreviews'
import {
  getDefaultSlidesParameters,
  getSlidesLanguageOptionList,
  getSlidesVisualStyleOptionListFromPreviews,
  resolveSlidesVisualStyle,
  SLIDES_STYLE_PREVIEW_KIND,
} from './slidesSettings'

interface SlidesSettingsDialogProps {
  open: boolean
  initialParams: GenerateSlidesParameters
  onClose: () => void
  onGenerate: (params: GenerateSlidesParameters) => void
}

export const SlidesSettingsDialog = memo(function SlidesSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: SlidesSettingsDialogProps) {
  const { t } = useTranslation(['studio', 'common'])
  const [draftParams, setDraftParams] = useState<GenerateSlidesParameters>(initialParams)
  const slidesLanguageOptionList = getSlidesLanguageOptionList()
  // Fetched only once this dialog opens. The backend is the source of truth for
  // styles + preview art; a failed or empty response resolves to the hardcoded
  // option list.
  const { data: stylePreviews } = useStudioStylePreviews(SLIDES_STYLE_PREVIEW_KIND, {
    enabled: open,
  })
  const slidesVisualStyleOptionList = useMemo(
    () => getSlidesVisualStyleOptionListFromPreviews(stylePreviews),
    [stylePreviews],
  )

  const defaults = getDefaultSlidesParameters()
  const language = draftParams.language || defaults.language
  const visualStyle = resolveSlidesVisualStyle(
    slidesVisualStyleOptionList,
    draftParams.visual_style,
    stylePreviews?.default_visual_style,
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>{t('studio:settings.slides.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.language')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.languageHelp.slides')}
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
              {slidesLanguageOptionList.map((option) => (
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
              {t('studio:settings.visualStyleHelp.slides')}
            </Typography>
            <StylePreviewPicker
              value={visualStyle}
              options={slidesVisualStyleOptionList}
              onChange={(nextValue) =>
                setDraftParams((prev) => ({ ...prev, visual_style: nextValue }))
              }
              ariaLabel={t('studio:settings.visualStyle')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {slidesVisualStyleOptionList.find((option) => option.value === visualStyle)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.tip')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.tipHelp.slides')}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={3}
              maxRows={3}
              slotProps={{ htmlInput: { maxLength: 300 } }}
              placeholder={t('studio:settings.tipPlaceholder.slides')}
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
