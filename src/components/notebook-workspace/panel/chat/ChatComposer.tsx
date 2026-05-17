import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { Box } from '@mui/material'
import { ChatInputBox } from './ChatInputBox'

const composerMarginTop = 2

interface ChatComposerProps {
  value: string
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
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

export function ChatComposer({
  value,
  inputRef,
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
}: ChatComposerProps) {
  return (
    <Box sx={{ mt: composerMarginTop }}>
      <ChatInputBox
        value={value}
        inputRef={inputRef}
        onValueChange={onValueChange}
        onKeyDown={onKeyDown}
        isStreaming={isStreaming}
        isInputDisabled={isInputDisabled}
        isSubmitDisabled={isSubmitDisabled}
        isAbortDisabled={isAbortDisabled}
        enableThinking={enableThinking}
        isThinkingToggleDisabled={isThinkingToggleDisabled}
        leftControlsExtra={leftControlsExtra}
        rightControlsExtra={rightControlsExtra}
        onSend={onSend}
        onAbort={onAbort}
        onThinkingToggle={onThinkingToggle}
      />
    </Box>
  )
}
