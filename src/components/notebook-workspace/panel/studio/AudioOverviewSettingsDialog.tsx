import { memo, useState } from 'react'
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
  GenerateAudioOverviewParameters,
  StudioArtifactAudioOverviewStyle,
} from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  audioOverviewLanguageOptionList,
  audioOverviewStyleOptionList,
  defaultAudioOverviewParameters,
} from './audioOverviewSettings'

interface AudioOverviewSettingsDialogProps {
  open: boolean
  initialParams: GenerateAudioOverviewParameters
  onClose: () => void
  onGenerate: (params: GenerateAudioOverviewParameters) => void
}

export const AudioOverviewSettingsDialog = memo(function AudioOverviewSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: AudioOverviewSettingsDialogProps) {
  const [draftParams, setDraftParams] = useState<GenerateAudioOverviewParameters>(initialParams)

  const language = draftParams.language || defaultAudioOverviewParameters.language
  const style = draftParams.style || defaultAudioOverviewParameters.style || 'abstract'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>生成音频概览</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              选择语言
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              控制音频概览输出文本的语言。
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
              {audioOverviewLanguageOptionList.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              生成风格
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              控制音频概览的表达方式和内容组织。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={style}
              onChange={(_, nextValue: StudioArtifactAudioOverviewStyle | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, style: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {audioOverviewStyleOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {audioOverviewStyleOptionList.find((option) => option.value === style)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              附加提示
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={2}
              inputProps={{ maxLength: 300 }}
              placeholder="可补充强调重点、受众或表达要求。"
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
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => onGenerate(draftParams)}>
          生成
        </Button>
      </DialogActions>
    </Dialog>
  )
})
