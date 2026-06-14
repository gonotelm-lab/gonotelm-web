import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { buildSourceTreeStats } from '../preview/sourceTreeStats'
import { mapSourceTreeToMuiItems, type SourceTreeViewItem } from '../preview/sourceTreeViewAdapter'
import { workspaceTransitionPresets } from '../../../shared/ui/motionTokens'

interface SourceTreeSurfaceProps {
  tree: GetSourceParsedTreeResponse | null
  showStats: boolean
}

const collectTreeItemIds = (items: SourceTreeViewItem[]): string[] => {
  const ids: string[] = []
  const walk = (item: SourceTreeViewItem) => {
    ids.push(item.id)
    item.children.forEach(walk)
  }
  items.forEach(walk)
  return ids
}

export function SourceTreeSurface({ tree, showStats }: SourceTreeSurfaceProps) {
  const items = useMemo(() => mapSourceTreeToMuiItems(tree), [tree])
  const stats = useMemo(
    () => (showStats ? buildSourceTreeStats(tree) : null),
    [tree, showStats],
  )
  const defaultExpandedItems = useMemo(() => collectTreeItemIds(items), [items])

  if (items.length === 0) {
    return (
      <Box
        data-testid="source-tree-empty"
        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Typography variant="body2" color="text.secondary">
          当前来源暂无可展示的树结构。
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto', bgcolor: 'background.default' }}>
      {showStats ? (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            px: 1,
            py: 0.75,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {stats?.layerCounts.map((layer) => (
            <Typography key={layer.depth} variant="caption" sx={{ mr: 0.75 }}>
              L{layer.depth}: {layer.count}
            </Typography>
          ))}
        </Box>
      ) : null}
      <Box sx={{ px: 1, py: 1 }}>
        <RichTreeView
          items={items}
          aria-label="source parsed tree"
          defaultExpandedItems={defaultExpandedItems}
          itemChildrenIndentation={18}
          sx={{
            '& .MuiTreeItem-content': {
              minHeight: 34,
              borderRadius: 1.25,
              transition: workspaceTransitionPresets.backgroundOnly,
            },
            '& .MuiTreeItem-content:hover': {
              bgcolor: 'action.hover',
            },
            '& .MuiTreeItem-content[data-focused]': {
              outline: '2px solid',
              outlineColor: 'primary.light',
              outlineOffset: 1,
            },
          }}
        />
      </Box>
    </Box>
  )
}
