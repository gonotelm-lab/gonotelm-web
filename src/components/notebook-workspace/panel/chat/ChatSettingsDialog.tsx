import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { chatAnswerLengthOptionList, chatStyleOptionList, settingsToggleButtonSx, type ChatAnswerLengthOption, type ChatStyleOption } from './chatSettings'

interface ChatSettingsDialogProps {
  open: boolean
  chatStyle: ChatStyleOption
  answerLength: ChatAnswerLengthOption
  onClose: () => void
  onSave: () => void
  onChatStyleChange: (value: ChatStyleOption) => void
  onAnswerLengthChange: (value: ChatAnswerLengthOption) => void
}

export function ChatSettingsDialog({
  open,
  chatStyle,
  answerLength,
  onClose,
  onSave,
  onChatStyleChange,
  onAnswerLengthChange,
}: ChatSettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>对话设置</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              对话风格
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              控制回答语气与组织方式。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={chatStyle}
              onChange={(_, nextValue: ChatStyleOption | null) => {
                if (nextValue) {
                  onChatStyleChange(nextValue)
                }
              }}
              sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
            >
              {chatStyleOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Divider />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              回答长度
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              控制回答的详略程度。
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={answerLength}
              onChange={(_, nextValue: ChatAnswerLengthOption | null) => {
                if (nextValue) {
                  onAnswerLengthChange(nextValue)
                }
              }}
              sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
            >
              {chatAnswerLengthOptionList.map((option) => (
                <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
