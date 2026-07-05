import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MouseEvent } from 'react'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PsychologyAltOutlinedIcon from '@mui/icons-material/PsychologyAltOutlined'
import PsychologyAltRoundedIcon from '@mui/icons-material/PsychologyAltRounded'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import TripOriginOutlinedIcon from '@mui/icons-material/TripOriginOutlined'
import { Box, Collapse, IconButton, Typography } from '@mui/material'
import { AssistantMarkdown } from './AssistantMarkdown'
import type { ChatUiFragment, ChatUiFragmentType, ChatUiMessage } from './types'

interface ChatMessageFragmentsProps {
  message: ChatUiMessage
  isStreaming?: boolean
  isActiveAssistant?: boolean
  onCitationClick?: (event: MouseEvent<HTMLAnchorElement | HTMLElement>, citationIndex: string) => void
}

const normalizeFragmentType = (type: string): ChatUiFragmentType | null => {
  const normalized = type.toUpperCase()
  if (
    normalized === 'REQUEST' ||
    normalized === 'THINK' ||
    normalized === 'PHASE' ||
    normalized === 'RESPONSE'
  ) {
    return normalized
  }
  return null
}

const isThinkingFragment = (fragment: ChatUiFragment) => {
  const fragmentType = normalizeFragmentType(fragment.type)
  return fragmentType !== null && fragmentType !== 'REQUEST' && fragmentType !== 'RESPONSE'
}

export const extractCombinedResponseContent = (fragments: ChatUiFragment[]) =>
  fragments
    .filter((fragment) => normalizeFragmentType(fragment.type) === 'RESPONSE')
    .map((fragment) => fragment.response?.content ?? '')
    .join('\n')

export const extractThinkingFragments = (fragments: ChatUiFragment[]) =>
  fragments.filter(isThinkingFragment)

const thinkingSegmentHasContent = (fragment: ChatUiFragment) => {
  const fragmentType = normalizeFragmentType(fragment.type)
  if (fragmentType === 'PHASE') {
    return Boolean(fragment.phase?.summary?.trim() || fragment.phase?.thought?.trim())
  }
  if (fragmentType === 'THINK') {
    return Boolean(fragment.think?.content?.trim()) || fragment.think?.status === 'RUNNING'
  }
  return true
}

export const ChatMessageFragments = memo(function ChatMessageFragments({
  message,
  isStreaming,
  isActiveAssistant,
  onCitationClick,
}: ChatMessageFragmentsProps) {
  if (message.role === 'user') {
    const text =
      message.fragments.find((fragment) => normalizeFragmentType(fragment.type) === 'REQUEST')
        ?.request?.content ?? ''
    return (
      <Typography
        variant="body2"
        sx={{
          fontSize: 14.5,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </Typography>
    )
  }

  const thinkingFragments = useMemo(
    () => extractThinkingFragments(message.fragments),
    [message.fragments],
  )
  const responseContent = useMemo(
    () => extractCombinedResponseContent(message.fragments),
    [message.fragments],
  )
  const isActiveStream = Boolean(isStreaming && isActiveAssistant)
  const hasRunningThink = thinkingFragments.some(
    (fragment) => normalizeFragmentType(fragment.type) === 'THINK' && fragment.think?.status === 'RUNNING',
  )
  const isThinking = isActiveStream && (hasRunningThink || !responseContent.trim())
  const showThinkingBlock =
    thinkingFragments.length > 0 || (isActiveStream && !responseContent.trim())

  return (
    <Box>
      {showThinkingBlock ? (
        <ThinkingProcessBlock
          fragments={thinkingFragments}
          isStreaming={isActiveStream}
          isThinking={isThinking}
        />
      ) : null}

      {responseContent.trim() ? (
        isActiveStream ? (
          <Typography
            variant="body2"
            component="div"
            sx={{
              fontSize: 14.8,
              lineHeight: 1.72,
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {responseContent}
          </Typography>
        ) : (
          <AssistantMarkdown content={responseContent} onCitationClick={onCitationClick} />
        )
      ) : null}
    </Box>
  )
})

function ThinkingProcessBlock({
  fragments,
  isStreaming,
  isThinking,
}: {
  fragments: ChatUiFragment[]
  isStreaming: boolean
  isThinking: boolean
}) {
  const [expanded, setExpanded] = useState(isThinking)

  useEffect(() => {
    const shouldExpand = isThinking || isStreaming
    setExpanded((previous) => (previous === shouldExpand ? previous : shouldExpand))
  }, [isThinking, isStreaming])

  const visibleFragments = fragments.filter(thinkingSegmentHasContent)
  if (visibleFragments.length === 0 && !isThinking) {
    return null
  }

  const title = isThinking ? '思考中...' : '思考过程'

  return (
    <Box
      sx={{
        my: 0.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.25,
        bgcolor: 'action.hover',
        overflow: 'hidden',
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setExpanded((value) => !value)
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.65,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <PsychologyAltRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', flex: 1 }}>
          {title}
        </Typography>
        <IconButton
          size="small"
          aria-label={expanded ? '收起思考过程' : '展开思考过程'}
          onClick={(event) => {
            event.stopPropagation()
            setExpanded((value) => !value)
          }}
          sx={{ p: 0.25 }}
        >
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          )}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.1,
            pb: 1,
            pt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <ThinkingTimeline
            fragments={visibleFragments}
            isStreaming={isStreaming}
            isThinking={isThinking && visibleFragments.length === 0}
          />
        </Box>
      </Collapse>
    </Box>
  )
}

const resolvePhaseIcon = (summary: string) => {
  const text = summary.toLowerCase()
  if (/检索|搜索|查询|search|retrieve|query/.test(text)) {
    return SearchOutlinedIcon
  }
  if (/浏览|阅读|查看|read|browse|open/.test(text)) {
    return DescriptionOutlinedIcon
  }
  if (/分析|规划|计划|plan|analy/.test(text)) {
    return AutoAwesomeOutlinedIcon
  }
  return TripOriginOutlinedIcon
}

function ThinkingTimeline({
  fragments,
  isStreaming,
  isThinking,
}: {
  fragments: ChatUiFragment[]
  isStreaming: boolean
  isThinking: boolean
}) {
  if (fragments.length === 0) {
    return isThinking ? (
      <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary', pl: 3 }}>
        ...
      </Typography>
    ) : null
  }

  return (
    <Box sx={{ position: 'relative', pl: 0.25 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 9,
          top: 10,
          bottom: 10,
          width: '1.5px',
          bgcolor: 'divider',
          borderRadius: 1,
        }}
      />

      {fragments.map((fragment, index) => {
        const fragmentType = normalizeFragmentType(fragment.type)
        const isLast = index === fragments.length - 1
        return (
          <ThinkingTimelineItem
            key={`${fragmentType}-${fragment.id}`}
            fragment={fragment}
            isStreaming={isStreaming}
            isLast={isLast}
          />
        )
      })}
    </Box>
  )
}

function ThinkingTimelineItem({
  fragment,
  isStreaming,
  isLast,
}: {
  fragment: ChatUiFragment
  isStreaming: boolean
  isLast: boolean
}) {
  const fragmentType = normalizeFragmentType(fragment.type)

  if (fragmentType === 'PHASE') {
    const summary = fragment.phase?.summary?.trim() ?? ''
    const thought = fragment.phase?.thought?.trim() ?? ''
    if (!summary && !thought) {
      return null
    }

    const PhaseIcon = resolvePhaseIcon(summary)

    return (
      <ThinkingTimelineRow
        icon={<PhaseIcon />}
        isLast={isLast}
        content={
          <>
            {summary ? (
              <Typography variant="body2" sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.primary' }}>
                {summary}
              </Typography>
            ) : null}
            {thought ? (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: summary ? 0.3 : 0,
                  color: 'text.secondary',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {thought}
              </Typography>
            ) : null}
          </>
        }
      />
    )
  }

  if (fragmentType === 'THINK') {
    const content = fragment.think?.content ?? ''
    const isRunning = fragment.think?.status === 'RUNNING'
    if (!content.trim() && !isRunning) {
      return null
    }

    return (
      <ThinkingTimelineRow
        icon={<PsychologyAltOutlinedIcon />}
        isLast={isLast}
        iconColor={isRunning && isStreaming ? 'primary.main' : 'text.secondary'}
        content={
          <Typography
            variant="body2"
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'text.secondary',
            }}
          >
            {content}
            {isRunning && isStreaming ? (
              <Box
                component="span"
                aria-hidden
                sx={{
                  display: 'inline-block',
                  width: '0.55em',
                  ml: 0.1,
                  color: 'primary.main',
                  animation: 'think-stream-cursor 1s step-end infinite',
                  '@keyframes think-stream-cursor': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0 },
                  },
                }}
              >
                ▍
              </Box>
            ) : null}
            {!content && isRunning && isStreaming ? '...' : null}
          </Typography>
        }
      />
    )
  }

  return null
}

function ThinkingTimelineRow({
  icon,
  content,
  isLast,
  iconColor = 'text.secondary',
}: {
  icon: ReactNode
  content: ReactNode
  isLast: boolean
  iconColor?: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.85,
        pb: isLast ? 0 : 0.9,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 20,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: iconColor,
            '& .MuiSvgIcon-root': { fontSize: 14 },
          }}
        >
          {icon}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.1 }}>{content}</Box>
    </Box>
  )
}
