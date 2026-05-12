import type { KeyboardEvent, ReactNode } from 'react'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
} from '@mui/material'

interface ChatInputBoxProps {
  value: string
  isStreaming: boolean
  isInputDisabled: boolean
  isSubmitDisabled: boolean
  isAbortDisabled: boolean
  enableThinking: boolean
  isThinkingToggleDisabled: boolean
  leftControlsExtra?: ReactNode
  rightControlsExtra?: ReactNode
  onValueChange: (value: string) => void
  onThinkingToggle: (enabled: boolean) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSend: () => void
  onAbort: () => void
}

const inputBoxLayoutTokens = {
  paddingLeft: 2.1,
  paddingRight: 1.1,
  paddingTop: 0.65,
  paddingBottom: 0.55,
  gap: 1.28,
  borderRadius: 2,
}

const inputTextTokens = {
  fontSize: 15,
  lineHeight: 1.55,
}

const inputActionButtonTokens = {
  size: 30,
}

export function ChatInputBox({
  value,
  isStreaming,
  isInputDisabled,
  isSubmitDisabled,
  isAbortDisabled,
  enableThinking,
  isThinkingToggleDisabled,
  leftControlsExtra,
  rightControlsExtra,
  onValueChange,
  onThinkingToggle,
  onKeyDown,
  onSend,
  onAbort,
}: ChatInputBoxProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        pl: inputBoxLayoutTokens.paddingLeft,
        pr: inputBoxLayoutTokens.paddingRight,
        pt: inputBoxLayoutTokens.paddingTop,
        pb: inputBoxLayoutTokens.paddingBottom,
        display: 'flex',
        flexDirection: 'column',
        gap: inputBoxLayoutTokens.gap,
        borderRadius: inputBoxLayoutTokens.borderRadius,
      }}
    >
      <TextField
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="输入你的问题..."
        variant="standard"
        fullWidth
        multiline
        minRows={1}
        maxRows={5}
        disabled={isInputDisabled}
        slotProps={{
          input: {
            disableUnderline: true,
          },
        }}
        sx={{
          '& .MuiInputBase-root': {
            fontSize: inputTextTokens.fontSize,
            lineHeight: inputTextTokens.lineHeight,
            alignItems: 'flex-start',
          },
          '& textarea': {
            scrollbarWidth: 'thin',
            scrollbarColor: 'transparent transparent',
          },
          '& textarea::-webkit-scrollbar': {
            width: 5,
            height: 5,
          },
          '& textarea::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '& textarea::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: 'transparent',
          },
          '& textarea:hover': {
            scrollbarColor: 'rgba(120, 120, 120, 0.16) transparent',
          },
          '& textarea:hover::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(120, 120, 120, 0.16)',
          },
        }}
      />

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55 }}>
          <Button
            size="small"
            variant={enableThinking ? 'contained' : 'outlined'}
            color={enableThinking ? 'primary' : 'inherit'}
            onClick={() => {
              onThinkingToggle(!enableThinking)
            }}
            disabled={isThinkingToggleDisabled}
            startIcon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
            sx={{
              borderRadius: 999,
              textTransform: 'none',
              fontSize: 12.8,
              fontWeight: 600,
              minHeight: 29,
              px: 1.25,
              color: enableThinking ? 'primary.contrastText' : 'text.secondary',
              borderColor: enableThinking ? 'primary.main' : 'divider',
              '&:hover': {
                borderColor: enableThinking ? 'primary.main' : 'text.secondary',
              },
            }}
          >
            深度思考
          </Button>
          {leftControlsExtra}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {rightControlsExtra}
          <IconButton
            color="primary"
            onClick={() => {
              if (isStreaming) {
                onAbort()
                return
              }
              onSend()
            }}
            disabled={isStreaming ? isAbortDisabled : isSubmitDisabled}
            sx={{
              width: inputActionButtonTokens.size,
              height: inputActionButtonTokens.size,
              border: 1,
              borderColor: 'primary.main',
              flexShrink: 0,
              cursor:
                isStreaming
                  ? (isAbortDisabled ? 'not-allowed' : 'pointer')
                  : (isSubmitDisabled ? 'not-allowed' : 'pointer'),
            }}
          >
            {isStreaming ? <StopCircleIcon fontSize="small" /> : <ArrowUpwardIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  )
}
