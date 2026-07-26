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
  StudioArtifactInfoGraphicVisualStyle,
} from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  defaultInfoGraphicParameters,
  infoGraphicDetailLevelOptionList,
  infoGraphicLanguageOptionList,
  infoGraphicOrientationOptionList,
  infoGraphicVisualStyleOptionList,
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
  const visualStyle = draftParams.visual_style || defaultInfoGraphicParameters.visual_style || 'default'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>生成信息图</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              选择语言
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
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
              探索深度
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
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
              视觉风格
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              控制信息图的画面视觉风格。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={visualStyle}
              onChange={(_, nextValue: StudioArtifactInfoGraphicVisualStyle | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, visual_style: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {infoGraphicVisualStyleOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {infoGraphicVisualStyleOptionList.find((option) => option.value === visualStyle)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              选择方向
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
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
              描述你想要的信息图
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={2}
              inputProps={{ maxLength: 300 }}
              placeholder="引导风格、配色或重点：「使用蓝色主题并突出 3 个关键数据。」"
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
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => onGenerate(draftParams)}>
          生成
        </Button>
      </DialogActions>
    </Dialog>
  )
})
