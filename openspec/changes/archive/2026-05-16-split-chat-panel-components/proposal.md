## Why

`src/components/notebook-workspace/ChatPanel.tsx` 已经超过千行，持续把流式消息处理、滚动控制、设置弹窗、上下文操作和 UI 渲染耦合在同一个文件中，导致后续迭代风险和修改成本持续升高。当前需要在保持现有功能与交互不变的前提下进行结构化拆分，降低维护复杂度。

## What Changes

- 将 `ChatPanel` 从“单文件大组件”拆分为可组合的子组件与 hooks，按职责分离 UI 呈现、流式消息状态机、滚动行为和设置弹窗。
- 保持现有用户可见行为不变，包括消息发送/中断、流式状态文案、错误提示、设置弹窗交互、清空上下文按钮行为及样式。
- 提供清晰的模块边界与导出约定，减少后续功能扩展时对主容器组件的横向影响。
- 增加拆分后的回归验证清单，确保行为等价与构建稳定。

## Capabilities

### New Capabilities
- `chat-panel-modularization`: 定义 ChatPanel 的模块化拆分要求与行为等价约束，确保重构后维护性提升且不引入功能回归。

### Modified Capabilities
- 无

## Impact

- Affected code:
  - `src/components/notebook-workspace/ChatPanel.tsx`
  - `src/components/notebook-workspace/chat-panel/*`（新增/重组子组件与 hooks）
- Affected behavior:
  - 预期无外部行为变化（仅结构重构）。
- Dependencies:
  - 无新增第三方依赖，沿用现有 React + MUI + TanStack Query 栈。
