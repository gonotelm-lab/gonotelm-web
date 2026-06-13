import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
vi.mock('react-syntax-highlighter', () => ({
  Prism: () => null,
}))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneLight: {},
}))
import { MarkdownRenderer } from '@/components/notebook-workspace/shared/markdown'
import type { StudioArtifactKind } from '@/types/api'
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

  it('uses markdown renderer for report in overlay mode', () => {
    const content = 'fallback-content'
    const node = renderStudioArtifactPreviewContent({
      artifact: createArtifact('report'),
      content,
      mode: 'overlay',
    })
    expect(isValidElement(node)).toBe(true)
    if (isValidElement(node)) {
      const reportElement = node as ReactElement<{
        children?: ReactElement<{ content?: string }>
      }>
      expect(reportElement.props.children?.type).toBe(MarkdownRenderer)
      expect(reportElement.props.children?.props?.content).toBe(content)
    }
  })

  it('uses image renderer for info_graphic in overlay mode', () => {
    const node = renderStudioArtifactPreviewContent({
      artifact: {
        ...createArtifact('info_graphic'),
        contentUrl: 'https://example.com/infographic.png',
      },
      content: '',
      mode: 'overlay',
    })
    expect(isValidElement(node)).toBe(true)
    if (isValidElement(node)) {
      const container = node as ReactElement<{
        children?: ReactElement<{ src?: string }>
      }>
      expect(container.props.children?.props?.src).toBe('https://example.com/infographic.png')
    }
  })

  it('falls back to text renderer for unknown kinds', () => {
    const content = 'fallback-content'
    const node = renderStudioArtifactPreviewContent({
      artifact: createArtifact('unknown-kind' as StudioArtifactKind),
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
