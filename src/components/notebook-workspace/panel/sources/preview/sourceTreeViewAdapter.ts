import type { GetSourceParsedTreeResponse, SourceParsedTreeNode } from '@/types/api'

export interface SourceTreeViewItem {
  id: string
  label: string
  depth: number
  children: SourceTreeViewItem[]
}

const sanitizeLabel = (content: string | undefined) => {
  const raw = (content ?? '').trim()
  return raw.length > 0 ? raw.replace(/\s+/g, ' ') : '(空内容)'
}

const buildFallbackId = (path: number[], node: SourceParsedTreeNode): string =>
  `fallback:${path.join('.')}:l${node.level}:p${node.pos}`

const resolveNodeId = (node: SourceParsedTreeNode, path: number[]): string => {
  const id = node.id?.trim()
  return id && id.length > 0 ? id : buildFallbackId(path, node)
}

const mapNode = (
  node: SourceParsedTreeNode,
  depth: number,
  path: number[],
): SourceTreeViewItem => ({
  id: resolveNodeId(node, path),
  label: sanitizeLabel(node.content),
  depth,
  children: (node.children ?? []).map((child, index) =>
    mapNode(child, depth + 1, [...path, index]),
  ),
})

export const mapSourceTreeToMuiItems = (
  tree: GetSourceParsedTreeResponse | null | undefined,
): SourceTreeViewItem[] => {
  if (!tree?.root) {
    return []
  }
  return [mapNode(tree.root, 0, [0])]
}
