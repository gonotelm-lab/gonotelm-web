import { useState } from 'react'
import { InputBase, Typography } from '@mui/material'
import type { StudioArtifactKind } from '@/types/api'
import {
  workspaceRadius,
  workspaceSpace,
} from '@/components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '@/components/notebook-workspace/shared/ui/motionTokens'
import { workspaceTypeRem } from '@/components/notebook-workspace/shared/ui/typeTokens'
import { resolveStudioArtifactFallbackTitle } from '../resolveStudioArtifactKind'

interface StudioArtifactTitleBarProps {
  title: string
  kind: StudioArtifactKind
  editable: boolean
  onCommit: (title: string) => Promise<void>
  typographyVariant?: 'h5' | 'h6'
}

export function StudioArtifactTitleBar({
  title,
  kind,
  editable,
  onCommit,
  typographyVariant = 'h5',
}: StudioArtifactTitleBarProps) {
  const fallbackTitle = resolveStudioArtifactFallbackTitle(kind)
  const [draft, setDraft] = useState(title)
  const [committing, setCommitting] = useState(false)
  const [prevTitle, setPrevTitle] = useState(title)

  if (title !== prevTitle) {
    setPrevTitle(title)
    setDraft(title)
  }

  if (!editable) {
    return (
      <Typography variant={typographyVariant} sx={{ fontWeight: 600 }} noWrap>
        {title.trim() || fallbackTitle}
      </Typography>
    )
  }

  const fontSize = typographyVariant === 'h6' ? workspaceTypeRem.lg : workspaceTypeRem.xl

  const commitDraft = async () => {
    if (committing) {
      return
    }
    const next = draft.trim()
    if (next === title.trim()) {
      setDraft(title)
      return
    }
    setCommitting(true)
    try {
      await onCommit(next)
    } catch {
      setDraft(title)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <InputBase
      value={draft}
      placeholder={fallbackTitle}
      disabled={committing}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void commitDraft()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          const input = event.target as HTMLInputElement
          input.blur()
        }
      }}
      inputProps={{
        'aria-label': '产物标题',
        maxLength: 128,
      }}
      sx={{
        width: '100%',
        minWidth: 0,
        px: workspaceSpace.sm,
        py: workspaceSpace.xxs,
        borderRadius: workspaceRadius.md,
        border: 1,
        borderColor: 'transparent',
        bgcolor: 'transparent',
        cursor: 'text',
        fontSize,
        lineHeight: 1.35,
        fontWeight: 600,
        transition: workspaceTransitionPresets.borderBg,
        '& input': {
          cursor: 'text',
          textOverflow: 'ellipsis',
          p: 0,
        },
        '&:hover': {
          bgcolor: 'background.default',
          borderColor: 'divider',
        },
        '&.Mui-focused': {
          bgcolor: 'action.selected',
          borderColor: 'primary.main',
        },
      }}
    />
  )
}
