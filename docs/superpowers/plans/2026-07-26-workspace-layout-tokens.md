# Workspace Layout Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Notebook Workspace all-core 内建立并落地统一的 spacing / radius / interaction token，消除魔法数漂移。

**Architecture:** 新增 `layoutTokens.ts` 作为间距与圆角单源；扩展 `motionTokens.ts` 的交互约定；`panelStyles` / `chat/layoutTokens` 改为引用该单源；再按 Shell → Sources → Chat → Studio 替换组件内魔法数。

**Tech Stack:** React 19、MUI 9、Vite、Vitest、既有 Indigo Porcelain theme。

**Spec:** `docs/superpowers/specs/2026-07-26-workspace-layout-tokens-design.md`

## Global Constraints

- 范围：仅 Workspace（顶栏 + Sources / Chat / Studio）；不含 Home
- 布局比例、业务逻辑、接口、状态机不变
- 配色 / 字体沿用 Indigo Porcelain + T2
- Spacing 仅用：`4 / 8 / 12 / 16 / 24` px（MUI `0.5 / 1 / 1.5 / 2 / 3`）
- Radius 仅用：`8 / 10 / 12` px
- Hover 默认无位移、禁止 scale 抖布局；可点击 `cursor: pointer`；尊重 `prefers-reduced-motion`
- 工作目录：`gonotelm-web`；分支：`feat/web-ui-ux-optimization`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/notebook-workspace/shared/ui/layoutTokens.ts` | spacing / radius / 语义别名单源 |
| `src/components/notebook-workspace/shared/ui/layoutTokens.test.ts` | token 刻度与别名契约测试 |
| `src/components/notebook-workspace/shared/ui/motionTokens.ts` | 既有动效 + interaction 辅助常量 |
| `src/components/notebook-workspace/shared/ui/panelStyles.ts` | `panelTitleToBodySpacing` 指向 layoutTokens |
| `src/components/notebook-workspace/shared/ui/index.ts` | 导出新 token |
| `src/components/notebook-workspace/panel/chat/layoutTokens.ts` | re-export workspace panel padding，消除双源 |
| Shell / Sources / Chat / Studio 组件 | 替换魔法数为 token 引用 |

---

### Task 1: 创建 layoutTokens + 契约测试

**Files:**
- Create: `src/components/notebook-workspace/shared/ui/layoutTokens.ts`
- Create: `src/components/notebook-workspace/shared/ui/layoutTokens.test.ts`
- Modify: `src/components/notebook-workspace/shared/ui/index.ts`
- Modify: `src/components/notebook-workspace/shared/ui/panelStyles.ts`

**Interfaces:**
- Produces:
  - `workspaceSpace = { xxs: 0.5, sm: 1, md: 1.5, lg: 2, xl: 3 }`
  - `workspaceRadiusPx = { sm: 8, md: 10, lg: 12 }`
  - `workspaceRadius = { sm: '8px', md: '10px', lg: '12px' }`
  - `workspaceLayout = { panelPaddingX, panelPaddingY, panelTitleToBody, listRowGap, listInlineGap, chatMessageGap }`（值为 MUI spacing number）

- [ ] **Step 1: Write the failing test**

```ts
// src/components/notebook-workspace/shared/ui/layoutTokens.test.ts
import { describe, expect, it } from 'vitest'
import {
  workspaceLayout,
  workspaceRadiusPx,
  workspaceSpace,
} from './layoutTokens'

describe('workspace layout tokens', () => {
  it('exposes 4/8/12/16/24 px scale via MUI spacing units', () => {
    expect(workspaceSpace).toEqual({
      xxs: 0.5,
      sm: 1,
      md: 1.5,
      lg: 2,
      xl: 3,
    })
  })

  it('exposes radius 8/10/12 px', () => {
    expect(workspaceRadiusPx).toEqual({ sm: 8, md: 10, lg: 12 })
  })

  it('maps semantic aliases to the locked scale', () => {
    expect(workspaceLayout.panelPaddingX).toBe(workspaceSpace.xl)
    expect(workspaceLayout.panelPaddingY).toBe(workspaceSpace.lg)
    expect(workspaceLayout.panelTitleToBody).toBe(workspaceSpace.md)
    expect(workspaceLayout.listRowGap).toBe(workspaceSpace.sm)
    expect(workspaceLayout.listInlineGap).toBe(workspaceSpace.sm)
    expect(workspaceLayout.chatMessageGap).toBe(workspaceSpace.lg)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/notebook-workspace/shared/ui/layoutTokens.test.ts`

Expected: FAIL（module not found / export missing）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/notebook-workspace/shared/ui/layoutTokens.ts
/** MUI spacing units (theme.spacing = 8px). Locked: 4 / 8 / 12 / 16 / 24 px. */
export const workspaceSpace = {
  xxs: 0.5,
  sm: 1,
  md: 1.5,
  lg: 2,
  xl: 3,
} as const

export const workspaceRadiusPx = {
  sm: 8,
  md: 10,
  lg: 12,
} as const

export const workspaceRadius = {
  sm: `${workspaceRadiusPx.sm}px`,
  md: `${workspaceRadiusPx.md}px`,
  lg: `${workspaceRadiusPx.lg}px`,
} as const

export const workspaceLayout = {
  panelPaddingX: workspaceSpace.xl,
  panelPaddingY: workspaceSpace.lg,
  panelTitleToBody: workspaceSpace.md,
  listRowGap: workspaceSpace.sm,
  listInlineGap: workspaceSpace.sm,
  chatMessageGap: workspaceSpace.lg,
} as const

export type WorkspaceSpace = typeof workspaceSpace
export type WorkspaceLayout = typeof workspaceLayout
```

Update `panelStyles.ts`:

```ts
import { workspaceLayout } from './layoutTokens'

// ...
export const panelTitleToBodySpacing = workspaceLayout.panelTitleToBody
```

Update `index.ts` exports:

```ts
export {
  workspaceLayout,
  workspaceRadius,
  workspaceRadiusPx,
  workspaceSpace,
} from './layoutTokens'
export type { WorkspaceLayout, WorkspaceSpace } from './layoutTokens'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/notebook-workspace/shared/ui/layoutTokens.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  src/components/notebook-workspace/shared/ui/layoutTokens.ts \
  src/components/notebook-workspace/shared/ui/layoutTokens.test.ts \
  src/components/notebook-workspace/shared/ui/panelStyles.ts \
  src/components/notebook-workspace/shared/ui/index.ts \
  docs/superpowers/specs/2026-07-26-workspace-layout-tokens-design.md \
  docs/superpowers/plans/2026-07-26-workspace-layout-tokens.md
git commit -m "$(cat <<'EOF'
feat(workspace): add layout spacing/radius tokens

Establish a single 4/8/12/16/24 spacing scale and 8/10/12 radius tokens for Workspace UI polish.
EOF
)"
```

---

### Task 2: 扩展 interaction 约定（motionTokens）

**Files:**
- Modify: `src/components/notebook-workspace/shared/ui/motionTokens.ts`
- Modify: `src/components/notebook-workspace/shared/ui/index.ts`
- Create: `src/components/notebook-workspace/shared/ui/motionTokens.test.ts`

**Interfaces:**
- Consumes: 既有 `workspaceMotion` / `workspaceTransitionPresets`
- Produces:
  - `workspaceInteraction = { cursorPointer: 'pointer', hoverTransformNone: 'none', reducedMotionQuery: '@media (prefers-reduced-motion: reduce)' }`
  - `workspaceTransitionPresets.colorBorderBg` 保持；新增 `interactiveColorBorder`（无 transform）供可点击行/卡片使用

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { workspaceInteraction, workspaceTransitionPresets } from './motionTokens'

describe('workspace interaction tokens', () => {
  it('defaults hover to no transform and exposes reduced-motion query', () => {
    expect(workspaceInteraction.cursorPointer).toBe('pointer')
    expect(workspaceInteraction.hoverTransformNone).toBe('none')
    expect(workspaceInteraction.reducedMotionQuery).toBe(
      '@media (prefers-reduced-motion: reduce)',
    )
  })

  it('provides transform-free interactive transition preset', () => {
    expect(workspaceTransitionPresets.interactiveColorBorder).toContain('background-color')
    expect(workspaceTransitionPresets.interactiveColorBorder).toContain('border-color')
    expect(workspaceTransitionPresets.interactiveColorBorder).not.toContain('transform')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm exec vitest run src/components/notebook-workspace/shared/ui/motionTokens.test.ts`

- [ ] **Step 3: Implement**

在 `motionTokens.ts` 追加：

```ts
export const workspaceInteraction = {
  cursorPointer: 'pointer',
  hoverTransformNone: 'none',
  reducedMotionQuery: '@media (prefers-reduced-motion: reduce)',
} as const

// 在 workspaceTransitionPresets 内新增：
interactiveColorBorder:
  `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
  `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
  `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
```

导出更新 `index.ts`：`workspaceInteraction`

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/notebook-workspace/shared/ui/motionTokens.ts \
  src/components/notebook-workspace/shared/ui/motionTokens.test.ts \
  src/components/notebook-workspace/shared/ui/index.ts
git commit -m "$(cat <<'EOF'
feat(workspace): add interaction tokens without hover transform

Lock pointer cursor and transform-free interactive transitions for consistent UX.
EOF
)"
```

---

### Task 3: Shell 外壳接入 token

**Files:**
- Modify: `src/components/notebook-workspace/shared/ui/panelStyles.ts`（已在 Task 1 接好 titleToBody；本任务确认无残留 `1.3`）
- Modify: `src/components/notebook-workspace/shared/ui/PanelSubpageLayout.tsx`
- Modify: `src/components/notebook-workspace/shared/ui/previewActionStyles.ts`
- Modify: `src/components/notebook-workspace/layout/WorkspaceHeader.tsx`
- Modify: `src/pages/NotebookWorkspacePage.tsx`（仅当存在 spacing/radius 魔法数时）

**Interfaces:**
- Consumes: `workspaceLayout`, `workspaceRadius`, `workspaceSpace`, `workspaceTransitionPresets`, `workspaceInteraction`

- [ ] **Step 1: 扫描 Shell 文件中的漂移值**

Run:

```bash
rg -n "borderRadius:\s*[0-9]|spacing=\{0\.|p:\s*[0-9]|px:\s*[0-9]|py:\s*[0-9]|gap:\s*[0-9]|mt:\s*1\.3|translateY" \
  src/pages/NotebookWorkspacePage.tsx \
  src/components/notebook-workspace/layout/WorkspaceHeader.tsx \
  src/components/notebook-workspace/shared/ui/PanelSubpageLayout.tsx \
  src/components/notebook-workspace/shared/ui/previewActionStyles.ts
```

- [ ] **Step 2: 将命中值替换为 token**

映射规则：
- 水平 panel padding `3` → `workspaceLayout.panelPaddingX`
- 竖直 panel padding `2` → `workspaceLayout.panelPaddingY`
- 标题下间距 → `workspaceLayout.panelTitleToBody`（或既有 `panelTitleToBodySpacing`）
- 控件圆角 `10` → `workspaceRadius.md`；卡片 `12` → `workspaceRadius.lg`
- 可点击 hover：用 `workspaceTransitionPresets.interactiveColorBorder`，勿加 `translateY` / `scale`

- [ ] **Step 3: Run related tests**

Run: `pnpm exec vitest run src/components/notebook-workspace/shared/ui`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/NotebookWorkspacePage.tsx \
  src/components/notebook-workspace/layout/WorkspaceHeader.tsx \
  src/components/notebook-workspace/shared/ui/PanelSubpageLayout.tsx \
  src/components/notebook-workspace/shared/ui/previewActionStyles.ts
git commit -m "$(cat <<'EOF'
refactor(workspace): apply layout tokens to shell chrome

Align header and panel frame spacing/radius with the shared scale.
EOF
)"
```

---

### Task 4: Sources 面板收敛

**Files:**
- Modify: `src/components/notebook-workspace/panel/sources/SourcesPanel.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceListRow.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourceInlinePreview.tsx`
- Modify: `src/components/notebook-workspace/panel/sources/components/SourcePreviewOverlay.tsx`
- Test: `src/components/notebook-workspace/panel/sources/SourcesPanel.interaction.test.tsx`（应继续通过）

**Interfaces:**
- Consumes: `workspaceLayout`, `workspaceSpace`, `workspaceRadius`, `workspaceTransitionPresets`, `workspaceInteraction`

- [ ] **Step 1: 替换 SourcesPanel 已知漂移**

当前已知（示例，实现时以文件为准）：
- `p: 2` → `p: workspaceLayout.panelPaddingY` 或分别设 `px/py` 为 `panelPaddingX/Y`（若该容器是整面板内边距，优先 `px: panelPaddingX, py: panelPaddingY`）
- `spacing={1.25}` / `columnGap: 0.75` / `spacing={0.75}` → `workspaceSpace.sm` 或 `workspaceLayout.listInlineGap`
- `Stack spacing` / 行 gap 统一到 `sm`（8px）或 `md`（12px），禁止 `0.75` 半档（除非图标贴字用 `xxs`）

- [ ] **Step 2: SourceListRow / Preview 外壳**

- 行内控件 gap → `workspaceLayout.listInlineGap`
- 行 padding → `workspaceSpace.md`（12px）量级
- overlay / preview `borderRadius` → `workspaceRadius.lg`
- 可点击行：`cursor: workspaceInteraction.cursorPointer` + `transition: workspaceTransitionPresets.interactiveColorBorder`

- [ ] **Step 3: Run tests**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/sources`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/notebook-workspace/panel/sources
git commit -m "$(cat <<'EOF'
refactor(sources): converge spacing and radius to layout tokens

Unify source list and preview chrome with the workspace scale.
EOF
)"
```

---

### Task 5: Chat 消除双源并收敛

**Files:**
- Modify: `src/components/notebook-workspace/panel/chat/layoutTokens.ts`
- Modify: `src/components/notebook-workspace/panel/chat/ChatPanel.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatPanelHeader.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatComposer.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatInputBox.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatMessageItem.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatMessagesList.tsx`
- Test: `src/components/notebook-workspace/panel/chat/ChatPanel.layout.test.tsx`

**Interfaces:**
- Consumes: `workspaceLayout` from shared `layoutTokens`
- Produces: `chatPanelLayoutTokens` 保持旧 import 路径可用，但值为 workspace 单源

- [ ] **Step 1: Rewrite chat/layoutTokens.ts**

```ts
import { workspaceLayout, workspaceSpace } from '../../shared/ui/layoutTokens'

export const chatPanelLayoutTokens = {
  horizontalPadding: workspaceLayout.panelPaddingX,
  verticalPadding: workspaceLayout.panelPaddingY,
} as const

export const chatMessageContentTokens = {
  sideMarginX: workspaceSpace.sm,
  scrollInnerPaddingX: chatPanelLayoutTokens.horizontalPadding,
  messageGap: workspaceLayout.chatMessageGap,
} as const
```

- [ ] **Step 2: 替换 ChatPanel 等文件中的漂移**

- `borderRadius: 1.5` → `workspaceRadius.md`（或 `lg`，按钮/浮层用 md/lg 按用途）
- `px: 1.5` → `workspaceSpace.md`
- 消息列表 `Stack spacing` / gap → `chatMessageContentTokens.messageGap`（16px）
- 可点击控件补 `cursor: pointer` 与 transform-free transition

- [ ] **Step 3: Run chat tests**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat`

Expected: PASS（含 `ChatPanel.layout.test.tsx`）

- [ ] **Step 4: Commit**

```bash
git add src/components/notebook-workspace/panel/chat
git commit -m "$(cat <<'EOF'
refactor(chat): re-export panel padding from workspace layout tokens

Remove the second spacing source and align message gaps to 16px.
EOF
)"
```

---

### Task 6: Studio 外壳与列表 / Overlay 收敛

**Files:**
- Modify: `src/components/notebook-workspace/panel/studio/StudioPanel.tsx`
- Modify: `src/components/notebook-workspace/panel/studio/components/StudioArtifactListItem.tsx`
- Modify: `src/components/notebook-workspace/panel/studio/components/StudioToolCard.tsx`
- Modify: `src/components/notebook-workspace/panel/studio/components/StudioArtifactPreviewOverlay.tsx`
- Modify: `src/components/notebook-workspace/panel/studio/components/StudioArtifactExtrasPopover.tsx`
- Modify: viewer 外壳（按需）：`FlashcardViewer.tsx` / `QuizViewer.tsx` 及 preview registry 外层 padding/radius
- Modify: 设置 Dialog 仅外层 Paper padding/radius（`*SettingsDialog.tsx`）
- Test: `StudioToolCard.test.tsx`、`StudioPanel.infoGraphicParams.test.tsx` 等既有测试

**Interfaces:**
- Consumes: `workspaceLayout`, `workspaceSpace`, `workspaceRadius`, `workspaceInteraction`, `workspaceTransitionPresets`

- [ ] **Step 1: StudioPanel + ToolCard + ListItem**

替换已知漂移：
- `spacing={0.8}` / `0.55` / `0.7` → `workspaceSpace.sm` 或 `xxs`（仅图标贴字）
- `p: 2` 面板 → `px/py` = panel padding tokens
- `borderRadius: 1.5` → `workspaceRadius.md`
- ListItem `px: 1.25` / `p: 1.1` → 收到 `md`（1.5）或 `sm`（1），不要半档

- [ ] **Step 2: PreviewOverlay + Viewer 外壳**

- `borderRadius: 1.6` / `2` → `workspaceRadius.lg`
- overlay header padding 收到 `space.md` / `space.lg` / `space.xl` 档
- Dialog Paper：`borderRadius: workspaceRadius.lg`，内容区 `p: workspaceSpace.lg` 或 `xl`

- [ ] **Step 3: Run studio tests**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/studio`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/notebook-workspace/panel/studio
git commit -m "$(cat <<'EOF'
refactor(studio): apply layout tokens to cards and overlays

Unify studio list, tool cards, and preview chrome spacing/radius.
EOF
)"
```

---

### Task 7: 全量扫尾 + 验收

**Files:**
- 任意 Task 1–6 遗漏的 `notebook-workspace` 文件

- [ ] **Step 1: ripgrep 漂移扫尾**

Run:

```bash
rg -n "borderRadius:\s*(1\.5|1\.6|2)\b|spacing=\{0\.(55|6|7|75|8|9)\}|columnGap:\s*0\.(55|7|75|8)|mt:\s*1\.3|translateY\(-1px\)|translateY\(-4px\)|scale\(" \
  src/components/notebook-workspace src/pages/NotebookWorkspacePage.tsx
```

对每个命中：
- 能映射到 token → 替换
- 确属非视觉特例（如图表库内部）→ 保留并加一行注释说明原因

- [ ] **Step 2: 全量单测**

Run: `pnpm test:unit`

Expected: 全部 PASS

- [ ] **Step 3: 目视检查清单（开发者本地）**

- [ ] Header + 三栏标题区间距一致（title→body = 12px）
- [ ] Sources / Chat / Studio 水平 padding 观感一致（24px）
- [ ] 列表行 hover 无跳动
- [ ] Chat 消息间距约 16px
- [ ] Overlay / Dialog 圆角 12px

- [ ] **Step 4: Commit**

```bash
git add -u src/components/notebook-workspace src/pages/NotebookWorkspacePage.tsx
git commit -m "$(cat <<'EOF'
chore(workspace): finish layout token sweep

Clear remaining spacing/radius drift and verify unit tests.
EOF
)"
```

---

## Spec Coverage Checklist

| Spec 要求 | Task |
|---|---|
| `layoutTokens` 单源 4/8/12/16/24 + radius 8/10/12 | Task 1 |
| interaction：pointer / 无位移 hover / reduced-motion | Task 2 |
| Shell 接入 | Task 3 |
| Sources 收敛 | Task 4 |
| Chat 消双源 + messageGap 16 | Task 5 |
| Studio 外壳 / overlay / dialog 外壳 | Task 6 |
| ripgrep 扫尾 + `pnpm test:unit` | Task 7 |
| 不改 Home / 布局 / 业务 | Global Constraints（全任务） |

## Self-Review Notes

- 无 TBD / “similar to Task N” 占位
- Token 名称在 Task 1–2 定义，后续任务统一引用
- Chat 旧路径 `chatPanelLayoutTokens` 保留为兼容 re-export，满足“消除双源”且降低改动面
