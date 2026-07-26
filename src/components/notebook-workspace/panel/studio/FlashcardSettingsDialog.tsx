import { memo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type {
  GenerateFlashcardParameters,
  StudioArtifactFlashcardCount,
  StudioArtifactFlashcardDifficulty,
} from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  defaultFlashcardParameters,
  flashcardCountOptionList,
  flashcardDifficultyOptionList,
} from './flashcardSettings'

interface FlashcardSettingsDialogProps {
  open: boolean
  initialParams: GenerateFlashcardParameters
  onClose: () => void
  onGenerate: (params: GenerateFlashcardParameters) => void
}

export const FlashcardSettingsDialog = memo(function FlashcardSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: FlashcardSettingsDialogProps) {
  const [draftParams, setDraftParams] = useState<GenerateFlashcardParameters>(initialParams)

  const count = draftParams.count || defaultFlashcardParameters.count || 'default'
  const difficulty = draftParams.difficulty || defaultFlashcardParameters.difficulty || 'medium'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>生成闪卡</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              数量风格
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              引导模型偏宏观或偏细节，不固定具体张数。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={count}
              onChange={(_, nextValue: StudioArtifactFlashcardCount | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, count: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {flashcardCountOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {flashcardCountOptionList.find((option) => option.value === count)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              难度
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              控制表述深度与考察强度。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={difficulty}
              onChange={(_, nextValue: StudioArtifactFlashcardDifficulty | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, difficulty: nextValue }))
                }
              }}
              sx={{ mt: workspaceDialogLayout.controlMt, flexWrap: 'wrap', gap: workspaceDialogLayout.toggleGap, border: 'none' }}
            >
              {flashcardDifficultyOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: workspaceDialogLayout.captionMt, display: 'block' }}>
              {flashcardDifficultyOptionList.find((option) => option.value === difficulty)?.description}
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
              slotProps={{ htmlInput: { maxLength: 300 } }}
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
