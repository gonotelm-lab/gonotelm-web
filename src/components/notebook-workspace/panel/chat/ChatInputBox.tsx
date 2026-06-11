import type { KeyboardEvent, ReactNode, Ref } from 'react'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ManageSearchIcon from '@mui/icons-material/ManageSearch'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
} from '@mui/material'

export interface ChatInputInteractionState {
  isStreaming: boolean
  isInputDisabled: boolean
  isSubmitDisabled: boolean
  isAbortDisabled: boolean
  enableThinking: boolean
  isThinkingToggleDisabled: boolean
  enableEnhancedRetrieval: boolean
  isEnhancedRetrievalToggleDisabled: boolean
}

interface ChatInputBoxProps {
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
const inputTextareaScrollbarTokens = {
  width: 5,
  height: 5,
  thumbRadius: 999,
  hoverThumbColor: 'rgba(120, 120, 120, 0.16)',
}
const thinkingButtonTokens = {
  controlsGap: 0.55,
  iconSize: 15,
  borderRadius: 999,
  fontSize: 12.8,
  minHeight: 29,
  paddingX: 1.25,
}
const rightControlRowGap = 0.5

const buildCapsuleToggleButtonSx = (enabled: boolean) => ({
  borderRadius: thinkingButtonTokens.borderRadius,
  textTransform: 'none',
  fontSize: thinkingButtonTokens.fontSize,
  fontWeight: 600,
  minHeight: thinkingButtonTokens.minHeight,
  px: thinkingButtonTokens.paddingX,
  color: enabled ? 'primary.contrastText' : 'text.secondary',
  borderColor: enabled ? 'primary.main' : 'divider',
  '& .MuiSvgIcon-root': {
    fontSize: thinkingButtonTokens.iconSize,
  },
  '&:hover': {
    borderColor: enabled ? 'primary.main' : 'text.secondary',
  },
})

export function ChatInputBox({
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
}: ChatInputBoxProps) {
  const {
    isStreaming,
    isInputDisabled,
    isSubmitDisabled,
    isAbortDisabled,
    enableThinking,
    isThinkingToggleDisabled,
    enableEnhancedRetrieval,
    isEnhancedRetrievalToggleDisabled,
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
            width: inputTextareaScrollbarTokens.width,
            height: inputTextareaScrollbarTokens.height,
          },
          '& textarea::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '& textarea::-webkit-scrollbar-thumb': {
            borderRadius: inputTextareaScrollbarTokens.thumbRadius,
            backgroundColor: 'transparent',
          },
          '& textarea:hover': {
            scrollbarColor: `${inputTextareaScrollbarTokens.hoverThumbColor} transparent`,
          },
          '& textarea:hover::-webkit-scrollbar-thumb': {
            backgroundColor: inputTextareaScrollbarTokens.hoverThumbColor,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: thinkingButtonTokens.controlsGap }}>
          <Button
            size="small"
            variant={enableThinking ? 'contained' : 'outlined'}
            color={enableThinking ? 'primary' : 'inherit'}
            onClick={() => {
              onThinkingToggle(!enableThinking)
            }}
            disabled={isThinkingToggleDisabled}
            startIcon={<AutoAwesomeIcon />}
            sx={buildCapsuleToggleButtonSx(enableThinking)}
          >
            深度思考
          </Button>
          <Button
            size="small"
            variant={enableEnhancedRetrieval ? 'contained' : 'outlined'}
            color={enableEnhancedRetrieval ? 'primary' : 'inherit'}
            onClick={() => {
              onEnhancedRetrievalToggle(!enableEnhancedRetrieval)
            }}
            disabled={isEnhancedRetrievalToggleDisabled}
            startIcon={<ManageSearchIcon />}
            sx={buildCapsuleToggleButtonSx(enableEnhancedRetrieval)}
          >
            增强检索
          </Button>
          {leftControlsExtra}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: rightControlRowGap }}>
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
