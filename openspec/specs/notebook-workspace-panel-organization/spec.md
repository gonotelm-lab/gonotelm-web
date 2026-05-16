# notebook-workspace-panel-organization Specification

## Purpose
TBD - created by archiving change refactor-notebook-workspace-by-panel. Update Purpose after archive.
## Requirements
### Requirement: Notebook workspace SHALL be organized by panel domains
`notebook-workspace` MUST 以 **单数** `panel/` 作为一级挂载点挂载各业务面板目录（例如 `sources`、`studio`、`chat`）。聊天编排与实现 MUST 同域位于 **`panel/chat/`**（`ChatPanel.tsx` + `components`、`hooks`、`constants` 等子目录），禁止使用临时的中转 re-export；添加来源对话框等 UI MUST 归入对应 panel 的 **`components/`** 语义层级（不使用独立 `add-source-dialog/` 目录名），并为每个 panel 提供清晰的模块边界。

#### Scenario: Developer inspects workspace structure
- **WHEN** 开发者查看 `src/components/notebook-workspace` 目录结构
- **THEN** 能够直接定位每个 panel 的独立目录与职责边界，而无需在同层文件中人工区分功能域

### Requirement: Panel internals SHALL follow a consistent layering convention
每个 panel 目录 MUST 采用一致的分层约定（如 `components`、`hooks`、`constants`、`types`、`index` 导出入口），以降低新增功能时的结构不确定性。

#### Scenario: Add a new feature in one panel
- **WHEN** 开发者为某个 panel 新增交互或状态逻辑
- **THEN** 变更应主要发生在该 panel 目录内部，并按统一分层落位，不要求修改其他 panel 的内部实现

### Requirement: Cross-panel concerns SHALL be placed in shared modules
跨 panel 复用的样式 token、工具函数或渲染能力 MUST 放置于共享层，而非任意依附某个 panel 目录，避免形成隐式耦合。

#### Scenario: Reuse utility across panels
- **WHEN** 同一能力被两个及以上 panel 使用
- **THEN** 该能力应位于共享模块并通过明确导出被引用，而不是从另一个 panel 的内部文件直接导入

### Requirement: Panel-directory refactor SHALL preserve existing behavior
在目录重构过程中，用户可见行为 MUST 与重构前保持一致，包括 panel 折叠/展开、来源管理、聊天流式交互、设置与弹窗流程。

#### Scenario: User executes existing workspace flows
- **WHEN** 用户执行原有 notebook workspace 关键操作路径
- **THEN** 页面行为、交互顺序与错误反馈保持一致，不引入新增步骤或功能回归

