import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { Box } from '@mui/material'
import { workspaceLayout } from '../../shared/ui/layoutTokens'
import { ChatInputBox, type ChatInputInteractionState } from './ChatInputBox'
import { ChatSuggestions } from './ChatSuggestions'

const composerMarginTop = workspaceLayout.panelPaddingY

interface ChatComposerProps {
  value: string
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
  interactionState: ChatInputInteractionState
  suggestions?: string[]
  suggestionsDisabled?: boolean
  leftControlsExtra?: ReactNode
  rightControlsExtra?: ReactNode
  onValueChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSend: () => void
  onAbort: () => void
  onSuggestionSelect?: (question: string) => void
}

export function ChatComposer({
  value,
  inputRef,
  interactionState,
  suggestions = [],
  suggestionsDisabled = false,
  leftControlsExtra,
  rightControlsExtra,
  onValueChange,
  onKeyDown,
  onSend,
  onAbort,
  onSuggestionSelect,
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
      />
      <ChatSuggestions
        suggestions={suggestions}
        disabled={suggestionsDisabled}
        onSelect={onSuggestionSelect}
      />
    </Box>
  )
}
