import type { KeyboardEvent } from 'react'
import { Box } from '@mui/material'
import { ChatInputBox } from './ChatInputBox'

interface ChatComposerProps {
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

export function ChatComposer({
  value,
  isStreaming,
  isInputDisabled,
  isSubmitDisabled,
  isAbortDisabled,
  onValueChange,
  onKeyDown,
  onSend,
  onAbort,
}: ChatComposerProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <ChatInputBox
        value={value}
        onValueChange={onValueChange}
        onKeyDown={onKeyDown}
        isStreaming={isStreaming}
        isInputDisabled={isInputDisabled}
        isSubmitDisabled={isSubmitDisabled}
        isAbortDisabled={isAbortDisabled}
        onSend={onSend}
        onAbort={onAbort}
      />
    </Box>
  )
}
