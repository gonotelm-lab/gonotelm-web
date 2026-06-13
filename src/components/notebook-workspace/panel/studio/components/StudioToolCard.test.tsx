import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { StudioToolCard } from './StudioToolCard'
import type { StudioToolDefinition } from '../types'

const toolWithAdvancedConfig: StudioToolDefinition = {
  id: 'info_graphic',
  title: '信息图',
  description: '基于勾选来源生成信息图',
  icon: BarChartRoundedIcon,
  availability: 'available',
  actionId: 'generate-info_graphic',
  hasAdvancedConfig: true,
}

type JsonTreeNode = {
  type?: string
  props?: Record<string, unknown>
  children?: Array<JsonTreeNode | string | null>
}

function collectButtonPaths(
  node: JsonTreeNode | string | null,
  path: JsonTreeNode[] = [],
): JsonTreeNode[][] {
  if (node == null || typeof node === 'string') {
    return []
  }

  const currentPath = [...path, node]
  const paths: JsonTreeNode[][] = node.type === 'button' ? [currentPath] : []

  for (const child of node.children ?? []) {
    paths.push(...collectButtonPaths(child, currentPath))
  }

  return paths
}

function isAncestorPath(ancestorPath: JsonTreeNode[], descendantPath: JsonTreeNode[]) {
  if (descendantPath.length <= ancestorPath.length) {
    return false
  }

  return ancestorPath.every((node, index) => node === descendantPath[index])
}

function hasNestedButton(tree: JsonTreeNode | string | null) {
  const buttonPaths = collectButtonPaths(tree)
  return buttonPaths.some((outerPath) =>
    buttonPaths.some(
      (innerPath) => outerPath !== innerPath && isAncestorPath(outerPath, innerPath),
    ),
  )
}

function createStudioToolCardRenderer() {
  const onClick = vi.fn()
  const onAdvancedClick = vi.fn()
  let renderer = null as unknown as ReactTestRenderer

  act(() => {
    renderer = create(
      <StudioToolCard
        tool={toolWithAdvancedConfig}
        onClick={onClick}
        onAdvancedClick={onAdvancedClick}
      />,
    )
  })

  return { renderer, onClick, onAdvancedClick }
}

describe('StudioToolCard', () => {
  it('does not render a button nested inside another button', () => {
    const { renderer } = createStudioToolCardRenderer()

    expect(hasNestedButton(renderer.toJSON() as JsonTreeNode | null)).toBe(false)
  })

  it('clicking advanced entry triggers only onAdvancedClick, not onClick', () => {
    const { renderer, onClick, onAdvancedClick } = createStudioToolCardRenderer()
    const clickStopPropagation = vi.fn()
    const mouseDownStopPropagation = vi.fn()
    const mouseDownPreventDefault = vi.fn()

    const advancedEntry = renderer.root.findByProps({
      'data-testid': 'studio-tool-card-advanced-entry',
    })

    act(() => {
      advancedEntry.props.onMouseDown({
        preventDefault: mouseDownPreventDefault,
        stopPropagation: mouseDownStopPropagation,
      })
    })

    act(() => {
      advancedEntry.props.onClick({
        stopPropagation: clickStopPropagation,
      })
    })

    expect(mouseDownPreventDefault).toHaveBeenCalledTimes(1)
    expect(mouseDownStopPropagation).toHaveBeenCalledTimes(1)
    expect(clickStopPropagation).toHaveBeenCalledTimes(1)
    expect(onAdvancedClick).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })
})
