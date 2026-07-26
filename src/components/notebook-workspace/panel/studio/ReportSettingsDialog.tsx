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
  GenerateReportParameters,
  StudioArtifactReportStyle,
} from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  defaultReportParameters,
  reportLanguageOptionList,
  reportStyleOptionList,
} from './reportSettings'

interface ReportSettingsDialogProps {
  open: boolean
  initialParams: GenerateReportParameters
  onClose: () => void
  onGenerate: (params: GenerateReportParameters) => void
}

export const ReportSettingsDialog = memo(function ReportSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: ReportSettingsDialogProps) {
  const [draftParams, setDraftParams] = useState<GenerateReportParameters>(initialParams)

  const language = draftParams.language || defaultReportParameters.language
  const style = draftParams.style || defaultReportParameters.style || 'default'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>生成报告</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              选择语言
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              控制报告输出的语言。
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
              {reportLanguageOptionList.map((option) => (
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
              控制报告的组织方式和内容侧重。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={style}
              onChange={(_, nextValue: StudioArtifactReportStyle | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, style: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {reportStyleOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {reportStyleOptionList.find((option) => option.value === style)?.description}
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
