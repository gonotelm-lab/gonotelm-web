import { useCallback, useMemo, useState, type ReactNode } from 'react'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { Box, Collapse, IconButton, Tooltip, Typography } from '@mui/material'
import type { GetSourceParsedTreeResponse, SourceParsedTreeNode } from '@/types/api'
import { buildSourceTreeStats } from '../preview/sourceTreeStats'

const treeIndentPx = 2
const treeNodeTooltipSlotProps = {
  popper: {
    modifiers: [
      {
        name: 'flip',
        enabled: true,
        options: {
          padding: 8,
        },
      },
      {
        name: 'preventOverflow',
        enabled: true,
        options: {
          altAxis: true,
          tether: true,
          padding: 8,
        },
      },
    ],
  },
  tooltip: {
    sx: {
      fontSize: 14,
      lineHeight: 1.25,
      maxWidth: 'min(520px, calc(100vw - 32px))',
      wordBreak: 'break-word',
    },
  },
}

interface SourceParsedTreeViewProps {
  tree: GetSourceParsedTreeResponse | null
}

export function SourceParsedTreeView({
  tree,
}: SourceParsedTreeViewProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())

  const toggleNode = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const treeStats = useMemo(() => buildSourceTreeStats(tree), [tree])

  const renderTreeNode = (node: SourceParsedTreeNode, depth: number): ReactNode => {
    const key = `${depth}-${node.pos}-${node.id || 'node'}`
    const children = node.children ?? []
    const hasChildren = children.length > 0
    const collapsed = collapsedKeys.has(key)
    const rawContent = (node.content || '(空内容)').trim() || '(空内容)'
    const previewContent = rawContent.replace(/\s+/g, ' ')

    return (
      <Box key={key} sx={{ minWidth: 0 }}>
        <Tooltip title={rawContent} placement="top-start" followCursor slotProps={treeNodeTooltipSlotProps}>
          <Box
            sx={{
              pl: depth * treeIndentPx,
              pr: 1,
              py: 0.35,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.08)',
              },
            }}
          >
            <IconButton
              size="small"
              disabled={!hasChildren}
              onClick={() => {
                if (!hasChildren) return
                toggleNode(key)
              }}
              sx={{ p: 0.2, visibility: hasChildren ? 'visible' : 'hidden' }}
            >
              {collapsed ? <ChevronRightIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
            </IconButton>
            {hasChildren ? (
              <FolderOutlinedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
            ) : (
              <DescriptionOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
            )}
            <Typography
              variant="caption"
              sx={{
                minWidth: 30,
                color: 'text.secondary',
                fontSize: 11,
                textAlign: 'center',
              }}
            >
              L{depth}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                minWidth: 0,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: depth === 0 ? 15.2 : depth === 1 ? 14 : 13,
                fontWeight: depth === 0 ? 600 : 400,
              }}
            >
              {previewContent}
            </Typography>
          </Box>
        </Tooltip>
        {hasChildren ? (
          <Collapse in={!collapsed} timeout={180} unmountOnExit>
            <Box sx={{ borderLeft: '1px dashed', borderColor: 'divider', ml: 1.2 }}>
              {children.map((child) => renderTreeNode(child, depth + 1))}
            </Box>
          </Collapse>
        ) : null}
      </Box>
    )
  }

  if (!tree?.root) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          当前来源暂无可展示的树结构。
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto', bgcolor: 'background.default' }}>
      {treeStats.layerCounts.length > 0 ? (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            px: 1.1,
            py: 0.7,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
            rowGap: 0.75,
          }}
        >
          {treeStats.layerCounts.map((layer) => (
            <Typography
              key={`layer-${layer.depth}`}
              variant="caption"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                color: 'text.secondary',
              }}
            >
              L{layer.depth}: {layer.count}
            </Typography>
          ))}
        </Box>
      ) : null}
      <Box sx={{ p: 1.25, minWidth: 0 }}>
        {renderTreeNode(tree.root, 0)}
      </Box>
    </Box>
  )
}
