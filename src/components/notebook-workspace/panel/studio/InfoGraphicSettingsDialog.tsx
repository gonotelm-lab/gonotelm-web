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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type {
  GenerateInfoGraphicParameters,
  StudioArtifactInfoGraphicDetailLevel,
  StudioArtifactInfoGraphicOrientation,
} from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import { StylePreviewPicker } from './components/StylePreviewPicker'
import { useStudioStylePreviews } from './hooks/useStudioStylePreviews'
import {
  getDefaultInfoGraphicParameters,
  getInfoGraphicDetailLevelOptionList,
  getInfoGraphicLanguageOptionList,
  getInfoGraphicOrientationOptionList,
  getInfoGraphicVisualStyleOptionListFromPreviews,
  INFO_GRAPHIC_STYLE_PREVIEW_KIND,
  resolveInfoGraphicVisualStyle,
} from './infoGraphicSettings'

interface InfoGraphicSettingsDialogProps {
  open: boolean
  initialParams: GenerateInfoGraphicParameters
  onClose: () => void
  onGenerate: (params: GenerateInfoGraphicParameters) => void
}

export const InfoGraphicSettingsDialog = memo(function InfoGraphicSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: InfoGraphicSettingsDialogProps) {
  const { t } = useTranslation(['studio', 'common'])
  const [draftParams, setDraftParams] = useState<GenerateInfoGraphicParameters>(initialParams)
  const infoGraphicLanguageOptionList = getInfoGraphicLanguageOptionList()
  const infoGraphicDetailLevelOptionList = getInfoGraphicDetailLevelOptionList()
  const infoGraphicOrientationOptionList = getInfoGraphicOrientationOptionList()
  // Fetched only once this dialog opens. The backend is the source of truth for
  // styles + preview art; a failed or empty response resolves to the hardcoded
  // option list.
  const { data: stylePreviews } = useStudioStylePreviews(INFO_GRAPHIC_STYLE_PREVIEW_KIND, {
    enabled: open,
  })
  const infoGraphicVisualStyleOptionList = useMemo(
    () => getInfoGraphicVisualStyleOptionListFromPreviews(stylePreviews),
    [stylePreviews],
  )

  const defaults = getDefaultInfoGraphicParameters()
  const orientation = draftParams.orientation || defaults.orientation
  const textLanguage = draftParams.text_language || defaults.text_language
  const detailLevel = draftParams.detail_level || defaults.detail_level || 'standard'
  const visualStyle = resolveInfoGraphicVisualStyle(
    infoGraphicVisualStyleOptionList,
    draftParams.visual_style,
    stylePreviews?.default_visual_style,
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>{t('studio:settings.infoGraphic.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.language')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.languageHelp.infoGraphic')}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={textLanguage}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, text_language: event.target.value }))
              }
              sx={{ mt: workspaceDialogLayout.controlMt }}
            >
              {infoGraphicLanguageOptionList.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.detailLevel')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.detailLevelHelp')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={detailLevel}
              onChange={(_, nextValue: StudioArtifactInfoGraphicDetailLevel | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, detail_level: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {infoGraphicDetailLevelOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {infoGraphicDetailLevelOptionList.find((option) => option.value === detailLevel)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.visualStyle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.visualStyleHelp.infoGraphic')}
            </Typography>
            <StylePreviewPicker
              value={visualStyle}
              options={infoGraphicVisualStyleOptionList}
              onChange={(nextValue) =>
                setDraftParams((prev) => ({ ...prev, visual_style: nextValue }))
              }
              ariaLabel={t('studio:settings.visualStyle')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {infoGraphicVisualStyleOptionList.find((option) => option.value === visualStyle)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.orientation')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              {t('studio:settings.orientationHelp')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={orientation}
              onChange={(_, nextValue: StudioArtifactInfoGraphicOrientation | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, orientation: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {infoGraphicOrientationOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('studio:settings.prompt')}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={2}
              slotProps={{ htmlInput: { maxLength: 300 } }}
              placeholder={t('studio:settings.promptPlaceholder')}
              value={draftParams.extra_prompt || ''}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, extra_prompt: event.target.value }))
              }
              sx={{ mt: workspaceDialogLayout.controlMt }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:action.cancel')}</Button>
        <Button variant="contained" onClick={() => onGenerate({ ...draftParams, visual_style: visualStyle })}>
          {t('common:action.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
})
