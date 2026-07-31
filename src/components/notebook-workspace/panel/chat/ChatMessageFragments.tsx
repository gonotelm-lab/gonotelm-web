import { memo, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { AssistantMarkdown } from './AssistantMarkdown'
import {
  normalizeFragmentType,
  resolveStickyPhaseStatusLabel,
  shouldShowPhaseStatus,
  THINKING_PHASE_LABEL,
  extractCombinedResponseContent,
} from './chatMessageFragmentsHelpers'
import { chatMessageContentTokens } from './layoutTokens'
import { workspaceSpace } from '../../shared/ui/layoutTokens'
import { workspaceAnimation } from '../../shared/ui/motionTokens'
import type { ChatUiMessage } from './types'
import { workspaceType } from '../../shared/ui/typeTokens'
import type { CitationClickTarget } from '../../shared/markdown/MarkdownRenderer'

interface ChatMessageFragmentsProps {
  message: ChatUiMessage
  isStreaming?: boolean
  isActiveAssistant?: boolean
  onCitationClick?: (
    event: MouseEvent<HTMLAnchorElement | HTMLElement>,
    target: CitationClickTarget,
  ) => void
}

const phaseStatusTokens = {
  marginBottom: workspaceSpace.xxs,
  gap: workspaceSpace.sm,
  spinnerSize: 14,
  textFontSize: 14.3,
  textLetterSpacing: 0.1,
  color: 'text.secondary',
}

const phaseStatusFlowTokens = {
  backgroundSize: '240% 100%',
  animationDurationSec: workspaceAnimation.streamStatusFlowDurationSec,
  backgroundStartPosition: '160% 0',
  backgroundEndPosition: '-160% 0',
}

export const ChatMessageFragments = memo(function ChatMessageFragments({
  message,
  isActiveAssistant,
  onCitationClick,
}: ChatMessageFragmentsProps) {
  const responseContent = useMemo(
    () => extractCombinedResponseContent(message.fragments),
    [message.fragments],
  )
  const showPhaseStatus = shouldShowPhaseStatus({
    isActiveAssistant,
    fragments: message.fragments,
  })
  const [stickyPhaseLabel, setStickyPhaseLabel] = useState(THINKING_PHASE_LABEL)
  const phaseStatusLabel = resolveStickyPhaseStatusLabel(
    message,
    stickyPhaseLabel,
    showPhaseStatus,
  )
  if (phaseStatusLabel !== stickyPhaseLabel) {
    setStickyPhaseLabel(phaseStatusLabel)
  }

  if (message.role === 'user') {
    const text =
      message.fragments.find((fragment) => normalizeFragmentType(fragment.type) === 'REQUEST')
        ?.request?.content ?? ''
    return (
      <Typography
        variant="body2"
        sx={{
          fontSize: workspaceType.sm,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </Typography>
    )
  }

  return (
    <Box>
      {showPhaseStatus ? <PhaseStatusIndicator label={phaseStatusLabel} /> : null}

      {responseContent.trim() ? (
        <AssistantMarkdown content={responseContent} onCitationClick={onCitationClick} />
      ) : null}
    </Box>
  )
})

const isThinkingLabel = (label: string) => label === THINKING_PHASE_LABEL

function PhaseStatusIndicator({ label }: { label: string }) {
  const theme = useTheme()
  const isThinking = isThinkingLabel(label)
  const flowGradient = useMemo(
    () =>
      `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.72)} 0%, ${alpha(theme.palette.primary.main, 0.72)} 10%, ${alpha(theme.palette.primary.main, 0.78)} 25%, ${alpha(theme.palette.primary.main, 0.88)} 40%, ${alpha(theme.palette.primary.dark, 0.98)} 50%, ${alpha(theme.palette.primary.main, 0.88)} 60%, ${alpha(theme.palette.primary.main, 0.78)} 75%, ${alpha(theme.palette.primary.main, 0.72)} 90%, ${alpha(theme.palette.primary.main, 0.72)} 100%)`,
    [theme.palette.primary.dark, theme.palette.primary.main],
  )

  return (
    <Box
      sx={{
        mb: phaseStatusTokens.marginBottom,
        mr: chatMessageContentTokens.sideMarginX,
        ml: chatMessageContentTokens.sideMarginX,
        display: 'flex',
        alignItems: 'center',
        gap: phaseStatusTokens.gap,
        minHeight: 22,
      }}
    >
      <CircularProgress
        size={phaseStatusTokens.spinnerSize}
        sx={{ color: 'primary.main', flexShrink: 0 }}
      />
      <Typography
        variant="body2"
        sx={{
          fontSize: phaseStatusTokens.textFontSize,
          fontWeight: 600,
          letterSpacing: phaseStatusTokens.textLetterSpacing,
          color: 'transparent',
          background: flowGradient,
          backgroundSize: phaseStatusFlowTokens.backgroundSize,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: `phase-status-text-flow ${phaseStatusFlowTokens.animationDurationSec}s linear infinite`,
          '@keyframes phase-status-text-flow': {
            from: { backgroundPosition: phaseStatusFlowTokens.backgroundStartPosition },
            to: { backgroundPosition: phaseStatusFlowTokens.backgroundEndPosition },
          },
        }}
      >
        {isThinking ? '思考中' : label}
      </Typography>
      {isThinking ? (
        <Box
          component="span"
          aria-hidden
          sx={{
            display: 'inline-flex',
            gap: '1px',
            ml: '1px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              component="span"
              sx={{
                opacity: 0,
                animation: `phase-dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                '@keyframes phase-dot-pulse': {
                  '0%, 40%': { opacity: 0 },
                  '50%': { opacity: 1 },
                  '90%, 100%': { opacity: 0 },
                },
                color: 'primary.main',
                fontSize: phaseStatusTokens.textFontSize,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              .
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  )
}
