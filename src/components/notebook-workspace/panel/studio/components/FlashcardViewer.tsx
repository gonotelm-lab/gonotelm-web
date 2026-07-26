import { useEffect, useMemo, useState } from 'react'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import {
  Alert,
  Box,
  IconButton,
  Popover,
  Stack,
  Typography,
} from '@mui/material'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceInteraction } from '../../../shared/ui/motionTokens'
import { workspaceType } from '../../../shared/ui/typeTokens'

export interface FlashcardCard {
  front: string
  back: string
  hint?: string
}

export interface FlashcardContent {
  cards: FlashcardCard[]
}

interface FlashcardViewerProps {
  content: string
  mode?: 'inline' | 'overlay'
}

const parseFlashcardContent = (content: string): FlashcardContent | null => {
  const raw = content.trim()
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as FlashcardContent
    if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const flipDurationMs = 620

const cardFaceSx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: { xs: workspaceSpace.lg, sm: workspaceSpace.xl },
  py: { xs: workspaceSpace.lg, sm: workspaceSpace.xl },
  borderRadius: workspaceRadius.lg,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'auto',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  transform: 'translateZ(1px)',
  willChange: 'transform',
} as const

const cardCornerIconSx = {
  position: 'absolute',
  top: 12,
  right: 12,
  fontSize: workspaceType.xl,
  color: 'text.disabled',
  opacity: 0.72,
  pointerEvents: 'none',
} as const

export function FlashcardViewer({ content, mode = 'inline' }: FlashcardViewerProps) {
  const parsed = useMemo(() => parseFlashcardContent(content), [content])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [hintAnchor, setHintAnchor] = useState<HTMLElement | null>(null)
  const isOverlay = mode === 'overlay'

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    setHintAnchor(null)
  }, [content])

  useEffect(() => {
    setHintAnchor(null)
  }, [index, flipped])

  const toggleFlip = () => {
    setFlipped((prev) => !prev)
  }

  if (!parsed) {
    return (
      <Alert severity="warning">
        闪卡内容无法解析，请确认产物 JSON 格式为 {'{ cards: [{ front, back, hint }] }'}。
      </Alert>
    )
  }

  const total = parsed.cards.length
  const safeIndex = Math.min(Math.max(index, 0), total - 1)
  const card = parsed.cards[safeIndex]
  const hint = (card.hint || '').trim()
  const hintOpen = Boolean(hintAnchor)

  const goPrev = () => {
    setFlipped(false)
    setIndex((prev) => Math.max(0, prev - 1))
  }

  const goNext = () => {
    setFlipped(false)
    setIndex((prev) => Math.min(total - 1, prev + 1))
  }

  const overlayCardWidth = 'min(720px, 86vw)'
  const overlayCardHeight = 'min(420px, 56vh)'

  return (
    <Stack
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        gap: workspaceSpace.md,
        alignItems: isOverlay ? 'center' : 'stretch',
        justifyContent: isOverlay ? 'center' : 'flex-start',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: isOverlay ? overlayCardWidth : '100%',
          flex: isOverlay ? '0 0 auto' : 1,
          minWidth: isOverlay ? 320 : undefined,
          minHeight: isOverlay ? 280 : 220,
          height: isOverlay ? overlayCardHeight : undefined,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            perspective: 1600,
            perspectiveOrigin: '50% 45%',
          }}
        >
          <Box
            role="button"
            tabIndex={0}
            aria-label={flipped ? '闪卡背面，点击翻转' : '闪卡正面，点击翻转'}
            onClick={toggleFlip}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggleFlip()
              }
            }}
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              cursor: workspaceInteraction.cursorPointer,
              userSelect: 'none',
              outline: 'none',
              transformStyle: 'preserve-3d',
              transformOrigin: 'center center',
              willChange: 'transform',
              transition: `transform ${flipDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              transform: flipped
                ? 'rotateY(180deg)'
                : 'rotateY(0deg)',
              '&:focus-visible': {
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}33`,
                borderRadius: workspaceRadius.lg,
              },
            }}
          >
            <Box
              sx={{
                ...cardFaceSx,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                boxShadow: isOverlay
                  ? '0 18px 48px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)'
                  : '0 8px 22px rgba(15, 23, 42, 0.1)',
                transition: `box-shadow ${flipDurationMs}ms ease`,
              }}
            >
              <HelpOutlineRoundedIcon sx={cardCornerIconSx} aria-hidden />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.55,
                  color: 'text.primary',
                }}
              >
                {card.front}
              </Typography>
            </Box>

            <Box
              sx={{
                ...cardFaceSx,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                boxShadow: isOverlay
                  ? '0 18px 48px rgba(15, 23, 42, 0.2), 0 4px 12px rgba(15, 23, 42, 0.1)'
                  : '0 8px 22px rgba(15, 23, 42, 0.12)',
                transform: 'rotateY(180deg) translateZ(1px)',
              }}
            >
              <TaskAltRoundedIcon sx={cardCornerIconSx} aria-hidden />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  textAlign: 'center',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.55,
                  color: 'text.primary',
                }}
              >
                {card.back}
              </Typography>
            </Box>
          </Box>
        </Box>

      </Box>

      <Box
        sx={{
          width: isOverlay ? overlayCardWidth : '100%',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box sx={{ justifySelf: 'start' }}>
          {hint ? (
            <>
              <IconButton
                size="small"
                aria-label="查看提示"
                aria-haspopup="true"
                aria-expanded={hintOpen}
                onClick={(event) => setHintAnchor(event.currentTarget)}
                sx={{ color: 'text.secondary' }}
              >
                <LightbulbOutlinedIcon fontSize="small" />
              </IconButton>
              <Popover
                open={hintOpen}
                anchorEl={hintAnchor}
                onClose={() => setHintAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{
                  paper: {
                    sx: {
                      maxWidth: 320,
                      p: workspaceSpace.md,
                    },
                  },
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {hint}
                </Typography>
              </Popover>
            </>
          ) : null}
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton
            size="small"
            aria-label="上一张"
            disabled={safeIndex <= 0}
            onClick={goPrev}
          >
            <NavigateBeforeRoundedIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 48, textAlign: 'center' }}>
            {safeIndex + 1} / {total}
          </Typography>
          <IconButton
            size="small"
            aria-label="下一张"
            disabled={safeIndex >= total - 1}
            onClick={goNext}
          >
            <NavigateNextRoundedIcon />
          </IconButton>
        </Stack>

        <Box />
      </Box>
    </Stack>
  )
}
