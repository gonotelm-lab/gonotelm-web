import type { GetSourceParsedTreeResponse } from '@/types/api'
import { SourceTreeSurface } from './SourceTreeSurface'

interface SourceParsedTreeViewProps {
  tree: GetSourceParsedTreeResponse | null
}

export function SourceParsedTreeView({ tree }: SourceParsedTreeViewProps) {
  return <SourceTreeSurface tree={tree} showStats />
}
