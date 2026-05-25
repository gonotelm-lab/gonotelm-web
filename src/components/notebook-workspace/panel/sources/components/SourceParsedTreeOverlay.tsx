import { useCallback, useMemo, useState, type ReactNode } from 'react'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import { Alert, Box, Button, Collapse, Dialog, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { GetSourceParsedTreeResponse, SourceParsedTreeNode } from '@/types/api'

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

interface SourceParsedTreeOverlayProps {
  open: boolean
  sourceName: string
  loading: boolean
  error: string
  tree: GetSourceParsedTreeResponse | null
  onClose: () => void
  onRetry: () => void
}

export function SourceParsedTreeOverlay({
  open,
  sourceName,
  loading,
  error,
  tree,
  onClose,
  onRetry,
}: SourceParsedTreeOverlayProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())

  const hasTree = Boolean(tree?.root)

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

  const treeStats = useMemo(() => {
    const root = tree?.root
    if (!root) {
      return {
        maxDepth: 0,
        totalNodes: 0,
        layerCounts: [] as Array<{ depth: number; count: number }>,
      }
    }

    let maxDepth = 0
    let totalNodes = 0
    const layerCountMap = new Map<number, number>()

    const walk = (node: SourceParsedTreeNode, depth: number) => {
      totalNodes += 1
      maxDepth = Math.max(maxDepth, depth)
      layerCountMap.set(depth, (layerCountMap.get(depth) ?? 0) + 1)
      ;(node.children ?? []).forEach((child) => walk(child, depth + 1))
    }

    walk(root, 0)

    const layerCounts = Array.from(layerCountMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([depth, count]) => ({ depth, count }))

    return { maxDepth, totalNodes, layerCounts }
  }, [tree])

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack
          direction="row"
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              展示 · {sourceName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              解析树高度：{tree?.height ?? '-'} · 层级：{treeStats.maxDepth + 1} · 节点：{treeStats.totalNodes}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="收起展示视口">
            <CloseIcon />
          </IconButton>
        </Stack>
        {treeStats.layerCounts.length > 0 ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              px: 2,
              py: 0.75,
              borderBottom: 1,
              borderColor: 'divider',
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
          </Stack>
        ) : null}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: 'background.default',
            userSelect: 'none',
          }}
        >
          {loading ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                正在加载解析树...
              </Typography>
            </Stack>
          ) : error ? (
            <Stack spacing={1.5} sx={{ p: 2 }}>
              <Alert severity="error">{error}</Alert>
              <Box>
                <Button size="small" variant="outlined" onClick={onRetry}>
                  重试
                </Button>
              </Box>
            </Stack>
          ) : !hasTree ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                当前来源暂无可展示的树结构。
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ p: 1.25, overflow: 'auto', height: '100%' }}>
              <Box sx={{ minWidth: 0, width: '100%' }}>
                {tree?.root ? renderTreeNode(tree.root, 0) : null}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
