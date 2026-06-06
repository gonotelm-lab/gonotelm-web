import { describe, expect, it } from 'vitest'
import type { GetSourceParsedTreeResponse, SourceParsedTreeNode } from '@/types/api'
import { mapSourceTreeToMuiItems } from './sourceTreeViewAdapter'

const baseNode = (
  overrides: Partial<SourceParsedTreeNode> = {},
): SourceParsedTreeNode => ({
  id: 'node-id',
  content: 'content',
  level: 0,
  pos: 0,
  is_leaf: true,
  children: [],
  ...overrides,
})

describe('mapSourceTreeToMuiItems', () => {
  it('将 API 树映射为 MUI Tree items', () => {
    const tree: GetSourceParsedTreeResponse = {
      height: 2,
      root: {
        id: 'root',
        content: 'Root',
        level: 0,
        pos: 0,
        is_leaf: false,
        children: [
          {
            id: 'child-1',
            content: 'Child 1',
            level: 1,
            pos: 1,
            is_leaf: true,
            children: [],
          },
        ],
      },
    }

    expect(mapSourceTreeToMuiItems(tree)).toEqual([
      {
        id: 'root',
        label: 'Root',
        depth: 0,
        children: [
          {
            id: 'child-1',
            label: 'Child 1',
            depth: 1,
            children: [],
          },
        ],
      },
    ])
  })

  it('空树返回空数组', () => {
    expect(mapSourceTreeToMuiItems({ height: 0 })).toEqual([])
  })

  it('null 或 undefined 返回空数组', () => {
    expect(mapSourceTreeToMuiItems(null)).toEqual([])
    expect(mapSourceTreeToMuiItems(undefined)).toEqual([])
  })

  it('label 归一化：空串、空白串显示“(空内容)”，多空白压缩为单空格', () => {
    const tree: GetSourceParsedTreeResponse = {
      height: 1,
      root: baseNode({
        id: 'root',
        content: '  Hello   world  ',
        children: [
          baseNode({ id: 'empty', content: '', level: 1, pos: 1 }),
          baseNode({ id: 'blank', content: '   \t\n  ', level: 1, pos: 2 }),
        ],
      }),
    }

    expect(mapSourceTreeToMuiItems(tree)).toEqual([
      {
        id: 'root',
        label: 'Hello world',
        depth: 0,
        children: [
          {
            id: 'empty',
            label: '(空内容)',
            depth: 1,
            children: [],
          },
          {
            id: 'blank',
            label: '(空内容)',
            depth: 1,
            children: [],
          },
        ],
      },
    ])
  })

  it('children 缺省时输出空数组', () => {
    const tree: GetSourceParsedTreeResponse = {
      height: 1,
      root: baseNode({
        id: 'leaf',
        content: 'Leaf',
        children: undefined,
      }),
    }

    expect(mapSourceTreeToMuiItems(tree)).toEqual([
      {
        id: 'leaf',
        label: 'Leaf',
        depth: 0,
        children: [],
      },
    ])
  })

  it('空 id 使用路径 + level + pos 回退，且不同分支不冲突', () => {
    const tree: GetSourceParsedTreeResponse = {
      height: 3,
      root: baseNode({
        id: '',
        content: 'Root',
        level: 0,
        pos: 0,
        is_leaf: false,
        children: [
          baseNode({
            id: '',
            content: 'Left',
            level: 1,
            pos: 0,
            is_leaf: false,
            children: [
              baseNode({
                id: '',
                content: 'Deep',
                level: 2,
                pos: 0,
              }),
            ],
          }),
          baseNode({
            id: '',
            content: 'Right',
            level: 1,
            pos: 0,
            is_leaf: false,
            children: [
              baseNode({
                id: '',
                content: 'Deep',
                level: 2,
                pos: 0,
              }),
            ],
          }),
        ],
      }),
    }

    const [root] = mapSourceTreeToMuiItems(tree)
    expect(root.id).toBe('fallback:0:l0:p0')
    expect(root.children[0].id).toBe('fallback:0.0:l1:p0')
    expect(root.children[0].children[0].id).toBe('fallback:0.0.0:l2:p0')
    expect(root.children[1].id).toBe('fallback:0.1:l1:p0')
    expect(root.children[1].children[0].id).toBe('fallback:0.1.0:l2:p0')
    expect(root.children[0].children[0].id).not.toBe(root.children[1].children[0].id)
  })
})
