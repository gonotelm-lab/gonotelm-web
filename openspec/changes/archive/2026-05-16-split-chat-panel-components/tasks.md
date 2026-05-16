## 1. 模块拆分与结构重组

- [x] 1.1 在 `src/components/notebook-workspace/chat-panel/` 下建立拆分后的目录结构（components、hooks、constants 等）。
- [x] 1.2 将设置弹窗相关 JSX 与样式提取为独立 `ChatSettingsDialog` 组件，并改为受控 props。
- [x] 1.3 将流式消息处理（发送、事件流消费、中断、状态切换）提取为独立 hook，保留现有调用顺序与语义。
- [x] 1.4 将滚动同步、复制反馈等交互逻辑提取为独立 hook 或工具函数，减少 `ChatPanel` 直接副作用代码。

## 2. 容器编排与行为等价

- [x] 2.1 重写 `ChatPanel.tsx` 为编排层：组装 hooks/子组件并传递必要依赖，不改变外部 props 合约。
- [x] 2.2 确保清空上下文胶囊按钮、设置按钮、消息列表与输入区行为与现状一致（仅迁移不增强）。
- [x] 2.3 清理拆分过程中遗留的重复状态、未使用导入和无效辅助函数。

## 3. 验证与回归

- [x] 3.1 执行构建与类型检查（至少覆盖 `vite build` 或等价命令）确认拆分后无编译回归。
- [x] 3.2 按回归清单验证关键路径：发送、流式更新、中断、清空上下文、打开/保存设置。
- [x] 3.3 在变更说明中记录模块边界与后续扩展点，便于后续功能继续沿拆分结构迭代。

## 进度备注（2026-05-16）

- 已通过代码结构确认：`1.1`、`1.2`、`1.3`、`2.1`。
- 已通过命令验证：`pnpm build` 成功，对应 `3.1`。
- 已根据人工回归反馈确认：`2.2`、`3.2`（2026-05-16）。
- 已在 `design.md` 补充模块边界、扩展点与最小人工回归清单，对应 `3.3`。
- 已新增轻量测试：`chatStreamDraftRetention.test.ts`、`chatConversationCommon.test.ts`，`pnpm test` 通过（9 tests）。
- 已补充 `useChatScrollControl`、`useCopyFeedback` 并完成 lint 清理；`pnpm eslint src/components/notebook-workspace/ChatPanel.tsx src/components/notebook-workspace/chat-panel` 通过，对应 `1.4`、`2.3`。
