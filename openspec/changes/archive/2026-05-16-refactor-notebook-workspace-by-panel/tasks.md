## 1. 目录规范与基础骨架

- [x] 1.1 确认目标目录树：`layout/`、**单数** `panel/{sources,studio,chat}`、`shared/`；`sources` 下添加对话框落在 `panel/sources/components/`。
- [x] 1.2 为各 panel 建立统一分层骨架（`components`/`hooks`/`types`/入口 `index.ts`），保证可编译。
- [x] 1.3 为 `layout` 与 `shared` 建立统一出口，跨域样式与 Markdown 从 `shared` 引用。

## 2. 批次 A：Sources 域迁移（含 Add Source Dialog）

- [x] 2.1 迁移 `SourcesPanel`、`SourceListRow`、`SourceSelectionController`、`sourceTypes` 至 `panel/sources`（Sources 主组件与 `sources` 域同目录）。
- [x] 2.2 将 `AddSourceDialog*` 落在 **`panel/sources/components/`**（dialogs 与一般 UI 同层语义，不单建 `add-source-dialog/`）。
- [x] 2.3 修复 Sources 域导入并移除顶层转发与 `notebook-workspace` 根目录冗余 re-export。
- [x] 2.4 批次 A 门禁：`pnpm eslint src/components/notebook-workspace` + `pnpm build`（本次随全量 `pnpm eslint`/build 已通过）。

## 3. 批次 B/C：Studio、Layout、Shared 与 Markdown 收敛

- [x] 3.1 迁移 `StudioPanel` 到 `panel/studio`，并由 `panel/studio/index.ts` 暴露。
- [x] 3.2 迁移 `WorkspaceHeader` 到 `layout`，workspace 级组件不依赖 panel 内部实现。
- [x] 3.3 `panelStyles`、`scrollbar`、`MarkdownRenderer`、标点归一并入 `shared`；删除根目录重复实现与中转发文件。
- [x] 3.4 批次 B/C 门禁：`pnpm eslint`、`pnpm test`、`pnpm build` 已通过。

## 4. 批次 D：Chat 域结构与全局钩子

- [x] 4.1 聊天实现迁入 **`panel/chat/`**；删除旧 `chat-panel/`；`panel/chat/ChatPanel.tsx` **直接**从同域 `components/constants/hooks` 取值（无中转 re-export）。
- [x] 4.2 `useSourcePolling` 迁入 `notebook-workspace/hooks/`，因其仅服务于 `NotebookWorkspacePage`。
- [x] 4.3 统一 `notebook-workspace/index.ts` 导出：对外仍从单一入口，`ChatPanel` 指向 `panel/chat/ChatPanel.tsx`。

## 5. 全量验证与变更基线沉淀

- [x] 5.1 轻量测试已覆盖共享工具与导出（含 `MarkdownRenderer.test.ts` → `shared/markdown`）。
- [x] 5.2 全量门禁：`pnpm eslint`、`pnpm test`、`pnpm build`。
- [x] 5.3 按 panel 人工回归冒烟：来源管理、聊天发送/中断、设置弹窗、折叠/展开（仍建议发布前手动跑一遍）。
- [x] 5.4 本设计文档与任务列表已对齐 **单数 `panel/`、`panel/chat/` 聊天域、`sources/components` 对话框语义、Markdown/shared 收口、钩子迁移**。

## 进度备注（2026-05-16）

- `panels/` 已重命名为 **`panel/`**；`notebook-workspace/index.ts` 仅从 `./panel/sources`、`./panel/studio` 拉出 panel API。
- 聊天：`chat-panel/` 已迁入 **`panel/chat/`**，`panel/chat/ChatPanel.tsx`/`shared/markdown` 等均直连目标模块；移除根目录单行转发文件批次（`scrollbar`/`MarkdownRenderer`/…）。
- **`AddSourceDialog*`**：`panel/sources/components/`。
- **`MarkdownRenderer` / `normalizeMarkdownDelimiters`**：唯一定位 **`shared/markdown/`**。
- **`useSourcePolling`**：`notebook-workspace/hooks/useSourcePolling.ts`，页面直达引用。
- `FlowLoadingOverlay` 已归属到 `panel/sources/components/`，根目录不再保留同名实现。
- 跨模块多层引用已收敛为 `@/` 别名导入（模块内短距仍使用相对路径）。
- 无保留的短期兼容转发文件；如遇外部仓库仍引用已删旧路径需在集成侧批量替换（当前 monorepo 内已全部更新）。
- 自动化：`pnpm eslint`（静默通过）、`pnpm test`（13 tests）、`pnpm build` 通过。
- 人工冒烟回归（5.3）已由用户确认完成。

## 任务完成度

共 **18** 项勾选任务：**18/18** 完成。
