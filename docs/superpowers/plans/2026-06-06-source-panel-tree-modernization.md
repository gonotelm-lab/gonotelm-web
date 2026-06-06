# Source Panel Tree Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `source panel` 的树展示升级为现代极简风，并统一 Inline/Overlay 渲染内核，保持 MIT 依赖与只读交互边界。

**Architecture:** 新增树数据适配层，将后端树数据映射到 MUI TreeView items；新增共享 `SourceTreeSurface` 组件承载统一树展示；`SourceParsedTreeView` 与 `SourceParsedTreeOverlay` 改为复用该共享组件。通过增量测试（适配器单测 + 组件单测 + 交互回归）保证行为无回归。

**Tech Stack:** React 19, TypeScript, MUI v9, `@mui/x-tree-view` (MIT), Vitest, react-test-renderer

---

## File Structure (implementation target)

- Create: `src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.ts`
- Create: `src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.test.ts`
- Create: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.tsx`
- Create: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx`
- Create: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.test.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeView.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx`
- Modify: `package.json` (新增 `@mui/x-tree-view`)

---

### Task 1: 引入树数据适配层与依赖

**Files:**
- Create: `src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.test.ts`
- Create: `src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.ts`
- Modify: `package.json`
- Test: `src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.test.ts`

- [ ] **Step 1: 先写失败测试（适配规则）**

```ts
import { describe, expect, it } from 'vitest'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { mapSourceTreeToMuiItems } from './sourceTreeViewAdapter'

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
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.test.ts"`

Expected: FAIL，报错找不到 `mapSourceTreeToMuiItems`。

- [ ] **Step 3: 写最小实现 + 接入依赖**

```ts
// src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.ts
import type { GetSourceParsedTreeResponse, SourceParsedTreeNode } from '@/types/api'

export interface SourceTreeViewItem {
  id: string
  label: string
  depth: number
  children: SourceTreeViewItem[]
}

const sanitizeLabel = (content: string | undefined) => {
  const raw = (content ?? '(空内容)').trim()
  return raw.length > 0 ? raw.replace(/\s+/g, ' ') : '(空内容)'
}

const mapNode = (node: SourceParsedTreeNode, depth: number): SourceTreeViewItem => ({
  id: node.id || `${depth}-${node.pos}`,
  label: sanitizeLabel(node.content),
  depth,
  children: (node.children ?? []).map((child) => mapNode(child, depth + 1)),
})

export const mapSourceTreeToMuiItems = (
  tree: GetSourceParsedTreeResponse | null | undefined,
): SourceTreeViewItem[] => {
  if (!tree?.root) {
    return []
  }
  return [mapNode(tree.root, 0)]
}
```

```json
// package.json (dependencies 节选)
{
  "dependencies": {
    "@mui/x-tree-view": "^9.1.0"
  }
}
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.test.ts"`

Expected: PASS，2/2 用例通过。

- [ ] **Step 5: 提交**

```bash
git add package.json src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.ts src/components/notebook-workspace/panel/sources/preview/sourceTreeViewAdapter.test.ts
git commit -m "feat: add source tree adapter for mui tree view"
```

---

### Task 2: 新建共享树展示组件（SourceTreeSurface）

**Files:**
- Create: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx`
- Create: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeView.tsx`
- Test: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx`

- [ ] **Step 1: 先写失败测试（空态 + 节点渲染 + 统计条）**

```tsx
import { create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { SourceTreeSurface } from './SourceTreeSurface'

vi.mock('@mui/x-tree-view/RichTreeView', () => ({
  RichTreeView: ({ items }: { items: Array<{ id: string; label: string }> }) => (
    <div data-testid="rich-tree">
      {items.map((item) => (
        <span key={item.id}>{item.label}</span>
      ))}
    </div>
  ),
}))

const tree: GetSourceParsedTreeResponse = {
  height: 1,
  root: {
    id: 'root',
    content: 'Root Node',
    level: 0,
    pos: 0,
    is_leaf: false,
    children: [],
  },
}

describe('SourceTreeSurface', () => {
  it('无 root 时展示空态文案', () => {
    const renderer = create(<SourceTreeSurface tree={{ height: 0 }} showStats />)
    expect(renderer.root.findAllByProps({ 'data-testid': 'source-tree-empty' }).length).toBe(1)
  })

  it('有 root 时渲染 RichTreeView 节点', () => {
    const renderer = create(<SourceTreeSurface tree={tree} showStats />)
    const labels = renderer.root.findAllByType('span').map((n) => n.children.join(''))
    expect(labels).toContain('Root Node')
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx"`

Expected: FAIL，报错找不到 `SourceTreeSurface`。

- [ ] **Step 3: 实现 SourceTreeSurface，并让 SourceParsedTreeView 只做薄封装**

```tsx
// src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.tsx
import { Box, Typography } from '@mui/material'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { buildSourceTreeStats } from '../preview/sourceTreeStats'
import { mapSourceTreeToMuiItems } from '../preview/sourceTreeViewAdapter'

interface SourceTreeSurfaceProps {
  tree: GetSourceParsedTreeResponse | null
  showStats: boolean
}

export function SourceTreeSurface({ tree, showStats }: SourceTreeSurfaceProps) {
  const items = mapSourceTreeToMuiItems(tree)
  const stats = buildSourceTreeStats(tree)

  if (items.length === 0) {
    return (
      <Box data-testid="source-tree-empty" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          当前来源暂无可展示的树结构。
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', minHeight: 0, overflow: 'auto', bgcolor: 'background.default' }}>
      {showStats ? (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          {stats.layerCounts.map((layer) => (
            <Typography key={layer.depth} variant="caption" sx={{ mr: 0.75 }}>
              L{layer.depth}: {layer.count}
            </Typography>
          ))}
        </Box>
      ) : null}
      <Box sx={{ px: 1, py: 1 }}>
        <RichTreeView
          items={items}
          aria-label="source parsed tree"
          defaultExpandedItems={items.map((item) => item.id)}
          itemChildrenIndentation={18}
        />
      </Box>
    </Box>
  )
}
```

```tsx
// src/components/notebook-workspace/panel/sources/components/SourceParsedTreeView.tsx
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { SourceTreeSurface } from './SourceTreeSurface'

interface SourceParsedTreeViewProps {
  tree: GetSourceParsedTreeResponse | null
}

export function SourceParsedTreeView({ tree }: SourceParsedTreeViewProps) {
  return <SourceTreeSurface tree={tree} showStats />
}
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx"`

Expected: PASS，空态和节点渲染测试通过。

- [ ] **Step 5: 提交**

```bash
git add src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.tsx src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx src/components/notebook-workspace/panel/sources/components/SourceParsedTreeView.tsx
git commit -m "refactor: introduce shared source tree surface component"
```

---

### Task 3: Overlay 复用共享树组件并做回归

**Files:**
- Create: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.test.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx`
- Test: `src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.test.tsx`
- Test: `src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx`

- [ ] **Step 1: 先写失败测试（Overlay 在成功态必须走 SourceTreeSurface）**

```tsx
import { create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { SourceParsedTreeOverlay } from './SourceParsedTreeOverlay'

const surfaceSpy = vi.hoisted(() => vi.fn())

vi.mock('./SourceTreeSurface', () => ({
  SourceTreeSurface: (props: object) => {
    surfaceSpy(props)
    return <div data-testid="surface" />
  },
}))

const tree: GetSourceParsedTreeResponse = {
  height: 1,
  root: { id: 'root', content: 'Root', level: 0, pos: 0, is_leaf: false, children: [] },
}

describe('SourceParsedTreeOverlay', () => {
  it('成功态渲染 SourceTreeSurface 且关闭统计条', () => {
    surfaceSpy.mockReset()
    create(
      <SourceParsedTreeOverlay
        open
        sourceName="来源一"
        loading={false}
        error=""
        tree={tree}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    )
    const props = surfaceSpy.mock.calls.at(-1)?.[0] as { showStats?: boolean } | undefined
    expect(props?.showStats).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.test.tsx"`

Expected: FAIL，旧实现未调用 `SourceTreeSurface`。

- [ ] **Step 3: 将 Overlay 树渲染改为复用 SourceTreeSurface**

```tsx
// SourceParsedTreeOverlay.tsx 关键结构
import { SourceTreeSurface } from './SourceTreeSurface'

return (
  <Dialog open={open} onClose={onClose} fullScreen>
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          展示 · {sourceName}
        </Typography>
        <IconButton onClick={onClose} aria-label="收起展示视口">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', bgcolor: 'background.default' }}>
        {loading ? (
          <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">正在加载解析树...</Typography>
          </Stack>
        ) : error ? (
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
            <Box><Button size="small" variant="outlined" onClick={onRetry}>重试</Button></Box>
          </Stack>
        ) : (
          <SourceTreeSurface tree={tree} showStats={false} />
        )}
      </Box>
    </Box>
  </Dialog>
)
```

- [ ] **Step 4: 再跑回归测试，确认通过**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.test.tsx" "src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx"`

Expected: PASS，Overlay 单测与 SourcesPanel 交互回归全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.tsx src/components/notebook-workspace/panel/sources/components/SourceParsedTreeOverlay.test.tsx src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx
git commit -m "refactor: reuse shared tree surface in source overlay"
```

---

### Task 4: 最终验证与交付检查

**Files:**
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.tsx`
- Test: `src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx`
- Test: `src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx`

- [ ] **Step 1: 先写失败测试（焦点态样式配置必须存在）**

```tsx
import { create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { SourceTreeSurface } from './SourceTreeSurface'

const richTreeSpy = vi.hoisted(() => vi.fn())

vi.mock('@mui/x-tree-view/RichTreeView', () => ({
  RichTreeView: (props: object) => {
    richTreeSpy(props)
    return <div />
  },
}))

it('RichTreeView 的 sx 包含 focused 样式', () => {
  richTreeSpy.mockReset()
  create(
    <SourceTreeSurface
      tree={{
        height: 1,
        root: { id: 'root', content: 'Root', level: 0, pos: 0, is_leaf: false, children: [] },
      }}
      showStats={false}
    />,
  )
  const props = richTreeSpy.mock.calls.at(-1)?.[0] as { sx?: Record<string, unknown> } | undefined
  expect(props?.sx).toHaveProperty('& .MuiTreeItem-content.Mui-focused')
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx"`

Expected: FAIL，Task 2 的实现尚未配置 focused 样式。

- [ ] **Step 3: 最小修正样式/属性并保持极简视觉**

```tsx
// SourceTreeSurface.tsx 中关键样式片段
<RichTreeView
  items={items}
  aria-label="source parsed tree"
  defaultExpandedItems={items.map((item) => item.id)}
  itemChildrenIndentation={18}
  sx={{
    '& .MuiTreeItem-content': {
      minHeight: 34,
      borderRadius: 1.25,
      transition: 'background-color 200ms ease',
    },
    '& .MuiTreeItem-content:hover': {
      bgcolor: 'action.hover',
    },
    '& .MuiTreeItem-content.Mui-focused': {
      outline: '2px solid',
      outlineColor: 'primary.light',
      outlineOffset: 1,
    },
  }}
/>
```

- [ ] **Step 4: 跑完整相关测试并确认通过**

Run: `npx vitest run "src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx" "src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx"`

Expected: PASS，全部相关测试通过。

- [ ] **Step 5: 提交**

```bash
git add src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.tsx src/components/notebook-workspace/panel/sources/components/SourceTreeSurface.test.tsx
git commit -m "style: polish source tree states and accessibility hooks"
```

---

## Definition of Done

- 树展示由共享组件统一承载，Inline/Overlay 视觉一致。
- 视觉风格从“文件夹浏览器感”升级为“简洁专业”。
- 仅使用 MIT 依赖（`@mui/x-tree-view`），未引入商业授权组件。
- 适配器单测、树组件单测、交互回归测试全部通过。

## Rollback Plan

- 若 `@mui/x-tree-view` 接入出现不可接受回归：
  1. 回退到 Task 1 前 commit。
  2. 保留 `sourceTreeViewAdapter`，后续可切 `react-arborist` 继续复用适配层。

