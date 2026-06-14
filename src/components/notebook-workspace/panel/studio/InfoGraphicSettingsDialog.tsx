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
  GenerateInfoGraphicParameters,
  StudioArtifactInfoGraphicDetailLevel,
  StudioArtifactInfoGraphicOrientation,
} from '@/types/api'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  defaultInfoGraphicParameters,
  infoGraphicDetailLevelOptionList,
  infoGraphicLanguageOptionList,
  infoGraphicOrientationOptionList,
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
  const [draftParams, setDraftParams] = useState<GenerateInfoGraphicParameters>(initialParams)

  const orientation = draftParams.orientation || defaultInfoGraphicParameters.orientation
  const textLanguage = draftParams.text_language || defaultInfoGraphicParameters.text_language
  const detailLevel = draftParams.detail_level || defaultInfoGraphicParameters.detail_level || 'standard'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>生成信息图</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              选择语言
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              控制信息图中可见文字的语言。
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={textLanguage}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, text_language: event.target.value }))
              }
              sx={{ mt: 1.25 }}
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
              探索深度
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              控制模型探索来源内容的深入程度。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={detailLevel}
              onChange={(_, nextValue: StudioArtifactInfoGraphicDetailLevel | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, detail_level: nextValue }))
                }
              }}
              sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
            >
              {infoGraphicDetailLevelOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>
              {infoGraphicDetailLevelOptionList.find((option) => option.value === detailLevel)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              选择方向
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              控制信息图的画面比例。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={orientation}
              onChange={(_, nextValue: StudioArtifactInfoGraphicOrientation | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, orientation: nextValue }))
                }
              }}
              sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
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
              描述你想要的信息图
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={2}
              placeholder="引导风格、配色或重点：「使用蓝色主题并突出 3 个关键数据。」"
              value={draftParams.extra_prompt || ''}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, extra_prompt: event.target.value }))
              }
              sx={{ mt: 1.25 }}
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
