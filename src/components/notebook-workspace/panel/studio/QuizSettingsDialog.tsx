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
  GenerateQuizParameters,
  StudioArtifactQuizCount,
  StudioArtifactQuizDifficulty,
} from '@/types/api'
import { settingsToggleButtonSx } from '../chat/chatSettings'
import {
  defaultQuizParameters,
  quizCountOptionList,
  quizDifficultyOptionList,
} from './quizSettings'

interface QuizSettingsDialogProps {
  open: boolean
  initialParams: GenerateQuizParameters
  onClose: () => void
  onGenerate: (params: GenerateQuizParameters) => void
}

export const QuizSettingsDialog = memo(function QuizSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: QuizSettingsDialogProps) {
  const [draftParams, setDraftParams] = useState<GenerateQuizParameters>(initialParams)

  const count = draftParams.count || defaultQuizParameters.count || 'default'
  const difficulty = draftParams.difficulty || defaultQuizParameters.difficulty || 'medium'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>生成测验</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              数量风格
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              引导模型偏精炼或偏细节，不固定具体题数。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={count}
              onChange={(_, nextValue: StudioArtifactQuizCount | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, count: nextValue }))
                }
              }}
              sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
            >
              {quizCountOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>
              {quizCountOptionList.find((option) => option.value === count)?.description}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              难度
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              控制表述深度与干扰项迷惑性。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={difficulty}
              onChange={(_, nextValue: StudioArtifactQuizDifficulty | null) => {
                if (nextValue) {
                  setDraftParams((prev) => ({ ...prev, difficulty: nextValue }))
                }
              }}
              sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
            >
              {quizDifficultyOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>
              {quizDifficultyOptionList.find((option) => option.value === difficulty)?.description}
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
