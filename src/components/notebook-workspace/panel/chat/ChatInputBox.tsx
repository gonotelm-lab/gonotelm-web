import type { KeyboardEvent, ReactNode, Ref } from 'react'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import {
  Box,
  IconButton,
  Paper,
  TextField,
} from '@mui/material'
import { workspaceRadius, workspaceSpace } from '../../shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../../shared/ui/motionTokens'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { workspaceType } from '../../shared/ui/typeTokens'
import { ChatSuggestions } from './ChatSuggestions'

export interface ChatInputInteractionState {
  isStreaming: boolean
  isInputDisabled: boolean
  isSubmitDisabled: boolean
  isAbortDisabled: boolean
}

interface ChatInputBoxProps {
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

const inputBoxLayoutTokens = {
  paddingLeft: workspaceSpace.md,
  paddingRight: workspaceSpace.md,
  paddingTop: workspaceSpace.sm,
  paddingBottom: workspaceSpace.xxs,
  gap: workspaceSpace.md,
  borderRadius: workspaceRadius.lg,
}

const inputTextTokens = {
  fontSize: workspaceType.sm,
  lineHeight: 1.55,
}

const inputActionButtonTokens = {
  size: 30,
}
const leftControlRowGap = workspaceSpace.xxs
const rightControlRowGap = workspaceSpace.xxs

export function ChatInputBox({
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
}: ChatInputBoxProps) {
  const {
    isStreaming,
    isInputDisabled,
    isSubmitDisabled,
    isAbortDisabled,
  } = interactionState

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
        bgcolor: 'background.paper',
      }}
    >
      <TextField
        value={value}
        inputRef={inputRef}
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
        sx={(theme) => ({
          '& .MuiInputBase-root': {
            fontSize: inputTextTokens.fontSize,
            lineHeight: inputTextTokens.lineHeight,
            alignItems: 'flex-start',
          },
          ...subtleScrollbarSx(theme, { within: '& textarea' }),
        })}
      />

      <Box
        data-testid="chat-input-controls-row"
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: workspaceSpace.md,
          py: workspaceSpace.xxs,
        }}
      >
        {leftControlsExtra ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: leftControlRowGap }}>
            {leftControlsExtra}
          </Box>
        ) : null}
        <ChatSuggestions
          suggestions={suggestions}
          disabled={suggestionsDisabled}
          onSelect={onSuggestionSelect}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: rightControlRowGap, ml: 'auto' }}>
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
              transition: workspaceTransitionPresets.interactiveColorBorder,
              cursor:
                isStreaming
                  ? (isAbortDisabled ? 'not-allowed' : 'pointer')
                  : (isSubmitDisabled ? 'not-allowed' : 'pointer'),
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            {isStreaming ? <StopCircleIcon fontSize="small" /> : <ArrowUpwardIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  )
}
