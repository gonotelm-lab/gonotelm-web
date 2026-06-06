import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { StudioArtifactItem } from '../types'
import { MindmapCanvas } from '../components/MindmapCanvas'
import { renderStudioArtifactPreviewContent } from './previewRenderRegistry'

const createArtifact = (kind: StudioArtifactItem['kind']): StudioArtifactItem => ({
  id: 'artifact-1',
  taskId: 'task-1',
  kind,
  actionId: 'generate-mindmap',
  title: '预览测试',
  status: 'completed',
  sourceCount: 2,
  sourceIds: ['source-1', 'source-2'],
  content: '',
  contentUrl: '',
  contentKind: 'inline',
  error: '',
  createdAt: Date.now(),
})

describe('renderStudioArtifactPreviewContent', () => {
  it('uses mindmap renderer for mindmap inline mode', () => {
    const node = renderStudioArtifactPreviewContent({
      artifact: createArtifact('mindmap'),
      content: '```mermaid\nmindmap\n  root((A))\n```',
      mode: 'inline',
    })
    expect(isValidElement(node)).toBe(true)
    const child = isValidElement(node)
      ? (node as ReactElement<{ children?: unknown }>).props.children
      : null
    expect(isValidElement(child)).toBe(true)
    if (isValidElement(child)) {
      const mindmapElement = child as ReactElement<{
        showBorder?: boolean
        surfaceRadius?: number
      }>
      expect(mindmapElement.type).toBe(MindmapCanvas)
      expect(mindmapElement.props.showBorder).toBe(false)
      expect(mindmapElement.props.surfaceRadius).toBe(0)
    }
  })

  it('falls back to text renderer for unknown kinds', () => {
    const content = 'fallback-content'
    const node = renderStudioArtifactPreviewContent({
      artifact: createArtifact('reports'),
      content,
      mode: 'overlay',
    })
    expect(isValidElement(node)).toBe(true)
    if (isValidElement(node)) {
      const fallbackElement = node as ReactElement<{
        variant?: string
        children?: ReactElement<{ children?: unknown }>
      }>
      expect(fallbackElement.props.variant).toBe('outlined')
      expect(String(fallbackElement.props.children?.props?.children)).toContain(content)
    }
  })
})
