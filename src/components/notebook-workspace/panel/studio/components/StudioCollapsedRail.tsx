import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import { Box, Divider, IconButton, Stack, Tooltip } from '@mui/material'
import {
  resolveStudioToolTone,
  resolveStudioToolToneKey,
} from '../../../shared/ui/studioSemanticTones'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceIconSize } from '../../../shared/ui/typeTokens'
import { artifactKindIconMap } from '../artifactKindIcons'
import {
  resolveStudioCollapsedRailSlotCount,
  studioCollapsedRailIconButtonPx,
  studioCollapsedRailSlotGapPx,
} from '../studioCollapsedRailLayout'
import type { StudioArtifactItem, StudioToolDefinition } from '../types'

interface StudioCollapsedRailProps {
  canManageContent: boolean
  tools: StudioToolDefinition[]
  artifacts: StudioArtifactItem[]
  pendingActionIds: Partial<Record<string, boolean>>
  selectedArtifactId?: string
  canSubmitArtifactTask: boolean
  onExpand: () => void
  onToolClick: (tool: StudioToolDefinition) => void
  onArtifactClick: (item: StudioArtifactItem) => void
}

/**
 * 折叠态竖条：按可用高度撑满槽位（不滚动）。
 * 有编辑权：工具优先，剩余槽位放产物；只读：只放产物。
 */
export const StudioCollapsedRail = memo(function StudioCollapsedRail({
  canManageContent,
  tools,
  artifacts,
  pendingActionIds,
  selectedArtifactId,
  canSubmitArtifactTask,
  onExpand,
  onToolClick,
  onArtifactClick,
}: StudioCollapsedRailProps) {
  const { t } = useTranslation(['studio', 'common'])
  const listRef = useRef<HTMLDivElement | null>(null)
  const [slotCount, setSlotCount] = useState(0)

  useLayoutEffect(() => {
    const node = listRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      return
    }
    const update = () => {
      setSlotCount(resolveStudioCollapsedRailSlotCount(node.clientHeight))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const { visibleTools, visibleArtifacts } = useMemo(() => {
    if (slotCount <= 0) {
      return { visibleTools: [] as StudioToolDefinition[], visibleArtifacts: [] as StudioArtifactItem[] }
    }
    if (!canManageContent) {
      return {
        visibleTools: [] as StudioToolDefinition[],
        visibleArtifacts: artifacts.slice(0, slotCount),
      }
    }
    const nextTools = tools.slice(0, slotCount)
    const remaining = Math.max(0, slotCount - nextTools.length)
    return {
      visibleTools: nextTools,
      visibleArtifacts: artifacts.slice(0, remaining),
    }
  }, [artifacts, canManageContent, slotCount, tools])

  return (
    <Stack
      data-testid="studio-collapsed-rail"
      sx={{
        height: '100%',
        minHeight: 0,
        alignItems: 'center',
        overflow: 'hidden',
        py: workspaceSpace.sm,
        gap: `${studioCollapsedRailSlotGapPx}px`,
      }}
    >
      <Tooltip title={t('studio:panel.expandAria')} arrow placement="left" enterDelay={240}>
        <IconButton
          size="small"
          color="default"
          aria-label={t('studio:panel.expandAria')}
          data-testid="studio-collapsed-expand"
          onClick={onExpand}
          sx={{
            width: studioCollapsedRailIconButtonPx,
            height: studioCollapsedRailIconButtonPx,
            flexShrink: 0,
          }}
        >
          <KeyboardDoubleArrowLeftIcon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
      </Tooltip>

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${studioCollapsedRailSlotGapPx}px`,
        }}
      >
        {visibleTools.map((tool) => {
          const Icon = tool.icon
          const actionId = tool.actionId
          const disabled =
            tool.availability !== 'available'
            || (Boolean(tool.artifactKind) && !canSubmitArtifactTask)
          const pending = Boolean(actionId && pendingActionIds[actionId])
          const interactive = !disabled && !pending
          return (
            <Tooltip
              key={tool.id}
              title={tool.title}
              arrow
              placement="left"
              enterDelay={240}
            >
              <span>
                <IconButton
                  size="small"
                  disabled={!interactive}
                  aria-label={tool.title}
                  data-testid={`studio-collapsed-tool-${tool.id}`}
                  onClick={() => {
                    if (interactive) onToolClick(tool)
                  }}
                  sx={(theme) => {
                    const tone = resolveStudioToolTone(
                      theme,
                      resolveStudioToolToneKey({
                        artifactKind: tool.artifactKind,
                        toolId: tool.id,
                      }),
                    )
                    return {
                      width: studioCollapsedRailIconButtonPx,
                      height: studioCollapsedRailIconButtonPx,
                      borderRadius: workspaceRadius.md,
                      color: interactive ? tone.icon : 'action.disabled',
                      flexShrink: 0,
                      '&:hover': interactive
                        ? { bgcolor: tone.surface, color: tone.accent }
                        : undefined,
                    }
                  }}
                >
                  <Icon sx={{ fontSize: workspaceIconSize.md }} />
                </IconButton>
              </span>
            </Tooltip>
          )
        })}

        {visibleTools.length > 0 && visibleArtifacts.length > 0 ? (
          <Divider
            flexItem
            data-testid="studio-collapsed-rail-divider"
            sx={{
              width: studioCollapsedRailIconButtonPx,
              alignSelf: 'center',
              flexShrink: 0,
              borderColor: 'divider',
            }}
          />
        ) : null}

        {visibleArtifacts.map((item) => {
          const KindIcon = artifactKindIconMap[item.kind] ?? artifactKindIconMap.note
          const selected = item.id === selectedArtifactId
          return (
            <Tooltip
              key={item.id}
              title={item.title}
              arrow
              placement="left"
              enterDelay={240}
            >
              <IconButton
                size="small"
                aria-label={item.title}
                data-testid={`studio-collapsed-artifact-${item.id}`}
                onClick={() => onArtifactClick(item)}
                sx={(theme) => {
                  const tone = resolveStudioToolTone(
                    theme,
                    resolveStudioToolToneKey({ artifactKind: item.kind }),
                  )
                  return {
                    width: studioCollapsedRailIconButtonPx,
                    height: studioCollapsedRailIconButtonPx,
                    borderRadius: workspaceRadius.md,
                    color: tone.icon,
                    flexShrink: 0,
                    bgcolor: selected ? tone.surface : 'transparent',
                    outline: selected ? `1px solid ${tone.accent}` : 'none',
                    outlineOffset: -1,
                    '&:hover': {
                      bgcolor: tone.surface,
                      color: tone.accent,
                    },
                  }
                }}
              >
                <KindIcon sx={{ fontSize: workspaceIconSize.md }} />
              </IconButton>
            </Tooltip>
          )
        })}
      </Box>
    </Stack>
  )
})
