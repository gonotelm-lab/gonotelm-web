import type { GetSourceParsedTreeResponse, SourceParsedTreeNode } from '@/types/api'

export interface SourceTreeStats {
  maxDepth: number
  totalNodes: number
  layerCounts: Array<{ depth: number; count: number }>
}

export const buildSourceTreeStats = (
  tree: GetSourceParsedTreeResponse | null,
): SourceTreeStats => {
  const root = tree?.root
  if (!root) {
    return {
      maxDepth: 0,
      totalNodes: 0,
      layerCounts: [],
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

  return {
    maxDepth,
    totalNodes,
    layerCounts,
  }
}
