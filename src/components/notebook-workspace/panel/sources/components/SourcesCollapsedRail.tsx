import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import { Box, Divider, IconButton, Stack, Tooltip } from '@mui/material'
import { resolveSourceTypeTone } from '../../../shared/ui/studioSemanticTones'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import {
  collapsedPanelRailIconButtonPx,
  collapsedPanelRailSlotGapPx,
  resolveCollapsedPanelRailSlotCount,
} from '../../../shared/ui/collapsedPanelRailLayout'
import { workspaceIconSize } from '../../../shared/ui/typeTokens'
import { resolveSourceTypeIcon } from '../sourceTypeIcons'
import type { SourceListItem } from '../types/sourceTypes'

interface SourcesCollapsedRailProps {
  canManageContent: boolean
  sources: SourceListItem[]
  selectedSourceId?: string
  addDisabled?: boolean
  onExpand: () => void
  onAddSource: () => void
  onSourceClick: (item: SourceListItem) => void
}

/**
 * 折叠态竖条：展开 +（可编辑时）添加来源，分割线后按高度撑满来源图标，不滚动。
 */
export const SourcesCollapsedRail = memo(function SourcesCollapsedRail({
  canManageContent,
  sources,
  selectedSourceId,
  addDisabled = false,
  onExpand,
  onAddSource,
  onSourceClick,
}: SourcesCollapsedRailProps) {
  const { t } = useTranslation(['sources', 'common'])
  const listRef = useRef<HTMLDivElement | null>(null)
  const [slotCount, setSlotCount] = useState(0)

  useLayoutEffect(() => {
    const node = listRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      return
    }
    const update = () => {
      setSlotCount(resolveCollapsedPanelRailSlotCount(node.clientHeight))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const { showAdd, visibleSources } = useMemo(() => {
    if (slotCount <= 0) {
      return { showAdd: false, visibleSources: [] as SourceListItem[] }
    }
    if (!canManageContent) {
      return {
        showAdd: false,
        visibleSources: sources.slice(0, slotCount),
      }
    }
    // 添加按钮占 1 槽；与来源之间的分割线不占槽（细线）。
    const remaining = Math.max(0, slotCount - 1)
    return {
      showAdd: true,
      visibleSources: sources.slice(0, remaining),
    }
  }, [canManageContent, slotCount, sources])

  return (
    <Stack
      data-testid="sources-collapsed-rail"
      sx={{
        height: '100%',
        minHeight: 0,
        alignItems: 'center',
        overflow: 'hidden',
        py: workspaceSpace.sm,
        gap: `${collapsedPanelRailSlotGapPx}px`,
      }}
    >
      <Tooltip title={t('sources:panel.expandAria')} arrow placement="right" enterDelay={240}>
        <IconButton
          size="small"
          color="default"
          aria-label={t('sources:panel.expandAria')}
          data-testid="sources-collapsed-expand"
          onClick={onExpand}
          sx={{
            width: collapsedPanelRailIconButtonPx,
            height: collapsedPanelRailIconButtonPx,
            flexShrink: 0,
          }}
        >
          <KeyboardDoubleArrowRightIcon sx={{ fontSize: workspaceIconSize.md }} />
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
          gap: `${collapsedPanelRailSlotGapPx}px`,
        }}
      >
        {showAdd ? (
          <Tooltip title={t('sources:panel.add')} arrow placement="right" enterDelay={240}>
            <span>
              <IconButton
                size="small"
                disabled={addDisabled}
                aria-label={t('sources:panel.add')}
                data-testid="sources-collapsed-add"
                onClick={onAddSource}
                sx={{
                  width: collapsedPanelRailIconButtonPx,
                  height: collapsedPanelRailIconButtonPx,
                  borderRadius: workspaceRadius.md,
                  color: 'text.secondary',
                  flexShrink: 0,
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                  '&.Mui-disabled': {
                    color: 'action.disabled',
                  },
                }}
              >
                <AddOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}

        {showAdd && visibleSources.length > 0 ? (
          <Divider
            flexItem
            data-testid="sources-collapsed-rail-divider"
            sx={{
              width: collapsedPanelRailIconButtonPx,
              alignSelf: 'center',
              flexShrink: 0,
              borderColor: 'divider',
            }}
          />
        ) : null}

        {visibleSources.map((item) => {
          const KindIcon = resolveSourceTypeIcon(item.iconType)
          const selected = item.id === selectedSourceId
          return (
            <Tooltip
              key={item.id}
              title={item.name}
              arrow
              placement="right"
              enterDelay={240}
            >
              <IconButton
                size="small"
                aria-label={item.name}
                data-testid={`sources-collapsed-source-${item.id}`}
                onClick={() => onSourceClick(item)}
                sx={(theme) => {
                  const tone = resolveSourceTypeTone(theme, item.iconType)
                  return {
                    width: collapsedPanelRailIconButtonPx,
                    height: collapsedPanelRailIconButtonPx,
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
