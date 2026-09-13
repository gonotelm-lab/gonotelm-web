import { memo, useState } from 'react'
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
  GenerateVideoOverviewParameters,
  StudioArtifactVideoOverviewVisualStyle,
} from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  getDefaultVideoOverviewParameters,
  getVideoOverviewLanguageOptionList,
  getVideoOverviewVisualStyleOptionList,
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
  const visualStyleOptionList = getVideoOverviewVisualStyleOptionList()

  const defaults = getDefaultVideoOverviewParameters()
  const language = draftParams.language || defaults.language
  const visualStyle = draftParams.visual_style || defaults.visual_style || 'default'

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
            <ToggleButtonGroup
              exclusive
              value={visualStyle}
              onChange={(_, nextValue: StudioArtifactVideoOverviewVisualStyle | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, visual_style: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {visualStyleOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
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
        <Button variant="contained" onClick={() => onGenerate(draftParams)}>
          {t('common:action.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  )
})
