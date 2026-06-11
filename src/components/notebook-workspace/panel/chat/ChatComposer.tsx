import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { Box } from '@mui/material'
import { ChatInputBox, type ChatInputInteractionState } from './ChatInputBox'

const composerMarginTop = 2

interface ChatComposerProps {
  value: string
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
  interactionState: ChatInputInteractionState
  leftControlsExtra?: ReactNode
  rightControlsExtra?: ReactNode
  onValueChange: (value: string) => void
  onThinkingToggle: (enabled: boolean) => void
  onEnhancedRetrievalToggle: (enabled: boolean) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSend: () => void
  onAbort: () => void
}

export function ChatComposer({
  value,
  inputRef,
  interactionState,
  leftControlsExtra,
  rightControlsExtra,
  onValueChange,
  onThinkingToggle,
  onEnhancedRetrievalToggle,
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
        interactionState={interactionState}
        leftControlsExtra={leftControlsExtra}
        rightControlsExtra={rightControlsExtra}
        onSend={onSend}
        onAbort={onAbort}
        onThinkingToggle={onThinkingToggle}
        onEnhancedRetrievalToggle={onEnhancedRetrievalToggle}
      />
    </Box>
  )
}
