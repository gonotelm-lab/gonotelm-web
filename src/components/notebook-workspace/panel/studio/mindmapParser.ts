export interface ParsedMindmapNode {
  id: string
  label: string
  depth: number
  parentId: string | null
}

export interface ParsedMindmapEdge {
  id: string
  from: string
  to: string
}

export interface ParsedMindmapResult {
  nodes: ParsedMindmapNode[]
  edges: ParsedMindmapEdge[]
  rootId: string | null
  childIdsByNodeId: Record<string, string[]>
  parentIdByNodeId: Record<string, string | null>
  parseError: string
}

const mermaidFenceRegexp = /```mermaid\s*([\s\S]*?)```/i
const rootNodeRegexp = /^root\(\((.+)\)\)$/
const nodeWithDoubleRoundBracketRegexp = /^[A-Za-z0-9_-]+\(\((.+)\)\)$/
const nodeWithRoundBracketRegexp = /^[A-Za-z0-9_-]+\((.+)\)$/
const nodeWithSquareBracketRegexp = /^[A-Za-z0-9_-]+\[(.+)\]$/

const normalizeRawMindmapContent = (raw: string) => {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) {
    return ''
  }
  const fenced = normalized.match(mermaidFenceRegexp)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }
  return normalized
}

const extractNodeLabel = (line: string): string | null => {
  const trimmed = line.trim()
  if (!trimmed || trimmed === 'mindmap' || trimmed.startsWith('%%')) {
    return null
  }

  const normalized = trimmed.replace(/^[-*+]\s+/, '')
  const rootMatched = normalized.match(rootNodeRegexp)
  if (rootMatched?.[1]) {
    return rootMatched[1].trim()
  }
  const doubleRoundMatched = normalized.match(nodeWithDoubleRoundBracketRegexp)
  if (doubleRoundMatched?.[1]) {
    return doubleRoundMatched[1].trim()
  }
  const roundMatched = normalized.match(nodeWithRoundBracketRegexp)
  if (roundMatched?.[1]) {
    return roundMatched[1].trim()
  }
  const squareMatched = normalized.match(nodeWithSquareBracketRegexp)
  if (squareMatched?.[1]) {
    return squareMatched[1].trim()
  }

  return normalized.trim()
}

const countLeadingSpaces = (line: string) => {
  let count = 0
  for (const char of line) {
    if (char === ' ') {
      count += 1
      continue
    }
    if (char === '\t') {
      count += 2
      continue
    }
    break
  }
  return count
}

export const parseMermaidMindmap = (rawContent: string): ParsedMindmapResult => {
  const content = normalizeRawMindmapContent(rawContent)
  if (!content) {
    return {
      nodes: [],
      edges: [],
      rootId: null,
      childIdsByNodeId: {},
      parentIdByNodeId: {},
      parseError: '思维导图内容为空。',
    }
  }

  const rawLines = content.split('\n')
  const nodes: ParsedMindmapNode[] = []
  const edges: ParsedMindmapEdge[] = []
  const childIdsByNodeId: Record<string, string[]> = {}
  const parentIdByNodeId: Record<string, string | null> = {}
  const levelStack: Array<{ indent: number; nodeId: string }> = []

  for (const rawLine of rawLines) {
    const label = extractNodeLabel(rawLine)
    if (!label) {
      continue
    }

    const indent = countLeadingSpaces(rawLine)
    while (
      levelStack.length > 0 &&
      indent <= levelStack[levelStack.length - 1].indent
    ) {
      levelStack.pop()
    }

    const parentId = levelStack[levelStack.length - 1]?.nodeId ?? null
    const nodeId = `mind-node-${nodes.length + 1}`
    const depth = levelStack.length

    nodes.push({
      id: nodeId,
      label,
      depth,
      parentId,
    })
    parentIdByNodeId[nodeId] = parentId
    if (!childIdsByNodeId[nodeId]) {
      childIdsByNodeId[nodeId] = []
    }

    if (parentId) {
      if (!childIdsByNodeId[parentId]) {
        childIdsByNodeId[parentId] = []
      }
      childIdsByNodeId[parentId].push(nodeId)
      edges.push({
        id: `mind-edge-${edges.length + 1}`,
        from: parentId,
        to: nodeId,
      })
    }

    levelStack.push({ indent, nodeId })
  }

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      rootId: null,
      childIdsByNodeId: {},
      parentIdByNodeId: {},
      parseError: '未解析到有效节点，请确认 Mermaid mindmap 语法。',
    }
  }

  const rootNode = nodes.find((node) => node.parentId === null) ?? nodes[0]
  return {
    nodes,
    edges,
    rootId: rootNode?.id ?? null,
    childIdsByNodeId,
    parentIdByNodeId,
    parseError: '',
  }
}
