import { useEffect, useMemo, useRef, useState } from 'react'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import { Alert, Box, IconButton, Tooltip } from '@mui/material'
import type { Edge, Network as VisNetwork, Node, Options } from 'vis-network'
import {
  parseMermaidMindmap,
  type ParsedMindmapResult,
} from '../mindmapParser'

interface MindmapCanvasProps {
  mermaid: string
  spacingPreset?: 'default' | 'wide'
  height?: number | string
}

const buildMindmapGraphOptions = (
  spacingPreset: NonNullable<MindmapCanvasProps['spacingPreset']>,
): Options => ({
  autoResize: true,
  layout: {
    hierarchical: {
      enabled: true,
      direction: 'LR',
      sortMethod: 'directed',
      levelSeparation: spacingPreset === 'wide' ? 210 : 170,
      nodeSpacing: spacingPreset === 'wide' ? 120 : 200,
      treeSpacing: spacingPreset === 'wide' ? 150 : 220,
      blockShifting: true,
      edgeMinimization: true,
      parentCentralization: true,
    },
  },
  interaction: {
    hover: false,
    dragNodes: true,
    dragView: true,
    zoomView: true,
    navigationButtons: true,
    keyboard: {
      enabled: true,
      bindToWindow: false,
    },
  },
  physics: {
    enabled: false,
  },
  nodes: {
    shape: 'box',
    borderWidth: 1.2,
    borderWidthSelected: 1.2,
    chosen: false,
    margin: {
      top: 10,
      right: 12,
      bottom: 10,
      left: 12,
    },
    color: {
      border: '#94A3B8',
      background: '#F8FAFC',
      highlight: {
        border: '#4F46E5',
        background: '#EEF2FF',
      },
    },
    font: {
      color: '#0F172A',
      size: 14,
      face: 'Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  },
  edges: {
    width: 1.5,
    color: {
      color: '#94A3B8',
      highlight: '#4F46E5',
    },
    smooth: {
      enabled: true,
      type: 'cubicBezier',
      forceDirection: 'horizontal',
      roundness: 0.45,
    },
  },
})

const buildHiddenNodeIds = (
  collapsedNodeIds: Set<string>,
  parsedMindmap: ParsedMindmapResult,
) => {
  const hiddenNodeIds = new Set<string>()
  const walkDescendants = (nodeId: string) => {
    const childIds = parsedMindmap.childIdsByNodeId[nodeId] ?? []
    for (const childId of childIds) {
      if (hiddenNodeIds.has(childId)) {
        continue
      }
      hiddenNodeIds.add(childId)
      walkDescendants(childId)
    }
  }

  collapsedNodeIds.forEach((nodeId) => {
    walkDescendants(nodeId)
  })
  return hiddenNodeIds
}

const buildNodeVisualByDepth = (depth: number) => {
  if (depth === 0) {
    return {
      border: '#6366F1',
      background: '#C7D2FE',
      fontColor: '#1E1B4B',
      fontSize: 17,
      fontWeight: '800',
    }
  }
  if (depth === 1) {
    return {
      border: '#1D4ED8',
      background: '#DBEAFE',
      fontColor: '#0F172A',
      fontSize: 14,
      fontWeight: '600',
    }
  }
  return {
    border: '#94A3B8',
    background: '#F8FAFC',
    fontColor: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  }
}

export function MindmapCanvas({
  mermaid,
  spacingPreset = 'default',
  height = 440,
}: MindmapCanvasProps) {
  const graphContainerRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<VisNetwork | null>(null)
  const hasInitializedViewportRef = useRef(false)
  const [networkReadyVersion, setNetworkReadyVersion] = useState(0)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    () => new Set(),
  )

  const parsedMindmap = useMemo(
    () => parseMermaidMindmap(mermaid),
    [mermaid],
  )
  const graphOptions = useMemo(
    () => buildMindmapGraphOptions(spacingPreset),
    [spacingPreset],
  )
  const defaultCollapsedNodeIds = useMemo(() => {
    const next = new Set<string>()
    parsedMindmap.nodes.forEach((node) => {
      const childIds = parsedMindmap.childIdsByNodeId[node.id] ?? []
      if (childIds.length > 0) {
        next.add(node.id)
      }
    })
    return next
  }, [parsedMindmap.childIdsByNodeId, parsedMindmap.nodes])

  const hiddenNodeIds = useMemo(
    () => buildHiddenNodeIds(collapsedNodeIds, parsedMindmap),
    [collapsedNodeIds, parsedMindmap],
  )

  const visibleGraphData = useMemo(() => {
    const visibleNodeIds = new Set<string>()
    const nodes: Node[] = parsedMindmap.nodes
      .filter((node) => !hiddenNodeIds.has(node.id))
      .map((node) => {
        visibleNodeIds.add(node.id)
        const childCount = parsedMindmap.childIdsByNodeId[node.id]?.length ?? 0
        const hasChildren = childCount > 0
        const collapsed = hasChildren && collapsedNodeIds.has(node.id)
        const nodeVisual = buildNodeVisualByDepth(node.depth)
        const collapsedPrefix = hasChildren
          ? collapsed
            ? '▶ '
            : '▼ '
          : ''

        return {
          id: node.id,
          label: `${collapsedPrefix}${node.label}`,
          level: node.depth,
          borderWidth: 1.2,
          color: {
            border: nodeVisual.border,
            background: nodeVisual.background,
          },
          font: {
            color: nodeVisual.fontColor,
            size: nodeVisual.fontSize,
            bold: nodeVisual.fontWeight,
          },
        }
      })

    const edges: Edge[] = parsedMindmap.edges
      .filter(
        (edge) =>
          visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to),
      )
      .map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
      }))

    return {
      nodes,
      edges,
    }
  }, [
    collapsedNodeIds,
    hiddenNodeIds,
    parsedMindmap.childIdsByNodeId,
    parsedMindmap.edges,
    parsedMindmap.nodes,
  ])

  useEffect(() => {
    let disposed = false
    let network: VisNetwork | null = null
    let handleClick: ((event: unknown) => void) | null = null

    const initNetwork = async () => {
      if (!graphContainerRef.current) {
        return
      }
      const { Network } = await import('vis-network')
      if (disposed || !graphContainerRef.current) {
        return
      }

      network = new Network(
        graphContainerRef.current,
        {
          nodes: [],
          edges: [],
        },
        graphOptions,
      )
      networkRef.current = network

      handleClick = (event: unknown) => {
        if (
          !event ||
          typeof event !== 'object' ||
          !('nodes' in event) ||
          !Array.isArray(event.nodes) ||
          event.nodes.length !== 1
        ) {
          return
        }
        const clickedNodeId = String(event.nodes[0] ?? '')
        if (!clickedNodeId) {
          return
        }
        const childIds =
          parsedMindmap.childIdsByNodeId[clickedNodeId] ?? []
        if (childIds.length === 0) {
          return
        }
        setCollapsedNodeIds((previous) => {
          const next = new Set(previous)
          if (next.has(clickedNodeId)) {
            next.delete(clickedNodeId)
          } else {
            next.add(clickedNodeId)
          }
          return next
        })
      }

      network.on('click', handleClick)
      setNetworkReadyVersion((prev) => prev + 1)
    }

    void initNetwork()
    return () => {
      disposed = true
      if (network && handleClick) {
        network.off('click', handleClick)
      }
      network?.destroy()
      networkRef.current = null
    }
  }, [graphOptions, parsedMindmap.childIdsByNodeId])

  useEffect(() => {
    const network = networkRef.current
    if (!network) {
      return
    }
    const shouldPreserveViewport = hasInitializedViewportRef.current
    const previousScale = shouldPreserveViewport ? network.getScale() : 1
    const previousPosition = shouldPreserveViewport
      ? network.getViewPosition()
      : null

    network.setData({
      nodes: visibleGraphData.nodes,
      edges: visibleGraphData.edges,
    })

    if (shouldPreserveViewport && previousPosition) {
      network.moveTo({
        position: previousPosition,
        scale: previousScale,
        animation: false,
      })
      return
    }

    if (parsedMindmap.rootId) {
      network.focus(parsedMindmap.rootId, {
        scale: 1,
        animation: {
          duration: 340,
          easingFunction: 'easeInOutCubic',
        },
      })
    } else {
      network.fit({
        animation: {
          duration: 340,
          easingFunction: 'easeInOutCubic',
        },
      })
    }
    hasInitializedViewportRef.current = true
  }, [
    networkReadyVersion,
    parsedMindmap.rootId,
    visibleGraphData.edges,
    visibleGraphData.nodes,
  ])

  useEffect(() => {
    // mindmap 内容切换后，下一轮数据渲染重新执行初次定位到根节点。
    hasInitializedViewportRef.current = false
    setCollapsedNodeIds(new Set(defaultCollapsedNodeIds))
  }, [defaultCollapsedNodeIds])

  const handleResetView = () => {
    hasInitializedViewportRef.current = false
    setCollapsedNodeIds(new Set(defaultCollapsedNodeIds))
  }

  if (parsedMindmap.parseError) {
    return <Alert severity="warning">{parsedMindmap.parseError}</Alert>
  }

  return (
    <Box
      sx={{
        height,
        borderRadius: 1.5,
        border: '1px dashed',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: '#F8FAFC',
        position: 'relative',
      }}
    >
      <Tooltip title="重置到初始视图">
        <IconButton
          size="small"
          onClick={handleResetView}
          aria-label="重置思维导图视图"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'grey.50',
            },
          }}
        >
          <RestartAltRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box
        ref={graphContainerRef}
        sx={{ width: '100%', height: '100%' }}
      />
    </Box>
  )
}
