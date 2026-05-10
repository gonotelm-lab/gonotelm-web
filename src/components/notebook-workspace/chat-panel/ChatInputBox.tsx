import type { KeyboardEvent } from 'react'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { IconButton, Paper, TextField } from '@mui/material'

interface ChatInputBoxProps {
  value: string
  isStreaming: boolean
  isInputDisabled: boolean
  isSubmitDisabled: boolean
  isAbortDisabled: boolean
  onValueChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSend: () => void
  onAbort: () => void
}

const inputBoxLayoutTokens = {
  paddingLeft: 2.4,
  paddingRight: 1.1,
  paddingY: 0.65,
  gap: 0.75,
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
  onValueChange,
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
        py: inputBoxLayoutTokens.paddingY,
        display: 'flex',
        alignItems: 'center',
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
            alignItems: 'center',
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
    </Paper>
  )
}
