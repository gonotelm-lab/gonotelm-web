import { Box, Button, Tooltip } from '@mui/material'
import { workspaceRadius, workspaceSpace } from '../../shared/ui/layoutTokens'
import { workspaceType } from '../../shared/ui/typeTokens'

const maxSuggestionCount = 3
const suggestionsRowGap = workspaceSpace.md

interface ChatSuggestionsProps {
  suggestions: string[]
  disabled?: boolean
  onSelect?: (question: string) => void
}

export function ChatSuggestions({
  suggestions,
  disabled = false,
  onSelect,
}: ChatSuggestionsProps) {
  const visibleSuggestions = suggestions.slice(0, maxSuggestionCount)

  if (visibleSuggestions.length === 0) {
    return null
  }

  const renderSuggestion = (question: string) => {
    const button = (
      <Button
        key={question}
        variant="outlined"
        size="small"
        disabled={disabled}
        onClick={() => onSelect?.(question)}
        data-suggestion={question}
        sx={{
          flex: '1 1 0',
          minWidth: 0,
          px: workspaceSpace.sm,
          py: workspaceSpace.xxs,
          borderRadius: workspaceRadius.md,
          textTransform: 'none',
          fontSize: workspaceType.xs,
          lineHeight: 1.35,
          color: 'text.secondary',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          },
        }}
      >
        <Box
          component="span"
          data-testid="chat-suggestion-text"
          sx={{
            display: 'block',
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            textAlign: 'center',
          }}
        >
          {question}
        </Box>
      </Button>
    )
    if (disabled) {
      return button
    }
    return (
      <Tooltip key={question} title={question} placement="top">
        {button}
      </Tooltip>
    )
  }

  return (
    <Box
      sx={{
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        alignItems: 'stretch',
        gap: suggestionsRowGap,
      }}
    >
      {visibleSuggestions.map(renderSuggestion)}
    </Box>
  )
}
