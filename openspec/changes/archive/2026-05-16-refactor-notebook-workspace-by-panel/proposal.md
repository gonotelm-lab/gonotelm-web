## Why

`src/components/notebook-workspace/` 当前处于“部分模块化”状态：聊天能力与 `sources`、`studio`、添加来源对话框及共享样式/Markdown 在目录演进中需要统一挂载点约定。稳定约定：**单数 `panel/`**（内含 `sources`、`studio`、`chat`）、`shared`、`layout`，并减少中转型 re-export。

本次需要在不改变现有用户可见行为的前提下，按 panel 维度完成目录重构与导入清理，以便未来新增功能时改动局部收敛。

## What Changes

- 按功能域重组：`panel/sources`、`panel/studio`；对话框组件与其它 sources UI **同归** `panel/sources/components/`。
- 聊天：**实现与编排**统一归入 `panel/chat/`；`ChatPanel.tsx` 与 `components/constants/hooks` 同域组织（不包含 `chat-panel` 路径前缀与转发层）。
- 共享：`shared/markdown` 容纳 `MarkdownRenderer` 与 `normalizeMarkdownDelimiters` **实现**（非根目录克隆）。
- 仅 workspace 页面使用的 **`useSourcePolling`** 迁至 `notebook-workspace/hooks/`。
- `FlowLoadingOverlay` 下沉到 `panel/sources/components/`（与使用点同域）。
- 跨模块导入采用 `@/` 别名，避免跨多层相对路径。
- 保持外部行为等价；用 eslint / test / build 作门禁。

## Capabilities

### New Capabilities
- `notebook-workspace-panel-organization`: 定义 notebook workspace 按 **单数** `panel` 与 `shared/layout` 分域的规则及行为等价性。

### Modified Capabilities
- 无

## Impact

- Affected code:
  - `src/components/notebook-workspace/**`
  - `src/pages/NotebookWorkspacePage.tsx`（`useSourcePolling` 导入路径）
- Affected behavior:
  - 预期无用户可见行为变化（结构与导入重构）。
- Dependencies:
  - 不新增第三方依赖。
