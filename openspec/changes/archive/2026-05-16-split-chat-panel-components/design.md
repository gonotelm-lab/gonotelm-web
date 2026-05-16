## Context

当前 `ChatPanel` 同时承担以下职责：消息历史分页、流式回复状态机、滚动同步、复制反馈、上下文清理、设置弹窗状态、以及大量头部/底部 UI 渲染。单文件高耦合导致：

- 修改任一交互时容易误伤流式主流程；
- 代码评审难以聚焦；
- 新功能（例如新增设置项）需要在大文件中穿插改动。

约束条件：

- 用户可见行为必须保持不变；
- 现有 API（`createChatMessage` / `streamChatEvents` / `abortChatStream` / `deleteChatContext`）不变；
- 不新增外部依赖。

## Goals / Non-Goals

**Goals:**

- 将 `ChatPanel` 拆分为职责清晰、可独立维护的子模块（容器、流处理、设置弹窗、UI 片段）。
- 维持现有交互与视觉行为一致（包括按钮状态、流式阶段文案、错误提示、滚动行为）。
- 提升后续变更可维护性：新增设置项或调整流式逻辑时减少横向影响面。

**Non-Goals:**

- 不改变聊天接口协议与请求参数语义；
- 不引入新的全局状态管理方案；
- 不进行功能增强（仅做结构性重构）。

## Decisions

### 1) 采用“容器 + 领域 hooks + 纯 UI 组件”分层

- 决策：`ChatPanel` 仅保留编排职责；复杂流程抽到 `chat-panel/hooks/*`；设置弹窗抽为独立组件。
- 原因：将“状态机逻辑”和“渲染逻辑”隔离，避免一个文件同时承担流程与视图。
- 备选方案：
  - 仅按 UI 片段拆组件，不拆 hooks：会保留大量闭包与副作用在主文件，收益有限。
  - 全部迁移到全局 store：改动面过大，超出本次范围。

### 2) 保持现有状态源与 API 调用位置语义不变

- 决策：沿用现有 `useMutation`/`useInfiniteQuery` 及本地状态字段，仅迁移代码位置，不改变行为顺序。
- 原因：将“重构风险”限定在文件组织层面，避免功能行为漂移。
- 备选方案：
  - 合并状态并重写流程：可进一步优化，但行为回归风险高。

### 3) 设置弹窗组件化，并通过 props 进行受控

- 决策：将设置弹窗提取为 `ChatSettingsDialog`（受控 value + onChange + onSave）。
- 原因：设置项会持续增长，单独组件便于迭代与单测。
- 备选方案：
  - 保持内联 JSX：短期成本低，但会继续拉长主文件。

### 4) 引入“行为等价回归清单”

- 决策：在任务阶段定义关键路径回归项（发送、流式、中断、清空上下文、设置弹窗）。
- 原因：该重构是结构性重构，验证重点是“无行为变化”。
- 备选方案：
  - 仅依赖人工冒烟：遗漏风险较高。

## Risks / Trade-offs

- [流式生命周期拆分后闭包依赖错误] → 通过显式依赖梳理与回归清单覆盖“发送/中断/重连”路径。
- [滚动与缓冲刷新时序回归] → 保留现有阈值和触发顺序，先迁移后等价验证，不在本次重构中做优化。
- [组件拆分后 props 过长] → 通过分层（settings props / stream props）降低单组件接口复杂度。
- [短期文件数量增加] → 换取长期维护成本下降，属于可接受 trade-off。

## Migration Plan

1. 先提取纯常量与纯函数（不带副作用），保持主流程不变。
2. 提取设置弹窗组件并接回现有状态。
3. 提取流式处理 hook（消息流、状态切换、缓冲刷新），由容器注入依赖。
4. 提取滚动与复制反馈相关逻辑到独立 hook。
5. 执行回归清单与构建检查，确认行为等价后收敛。

Rollback strategy:

- 每一步为可独立提交的机械拆分；出现问题可按提交粒度回滚到上一步稳定状态。

## 模块边界与扩展点（已落地）

- `ChatPanel.tsx`：容器编排层，通过 `chat-panel/components`、`chat-panel/hooks`、`chat-panel/constants` 入口组装依赖。
- `chat-panel/components/*`：UI 组件层（`ChatPanelHeader`、`ChatMessagesList`、`ChatComposer`、`ChatSettingsDialog` 等），由 `components/index.ts` 统一导出。
- `chat-panel/hooks/*`：会话逻辑层（`useChatConversation`、`useAssistantChunkBuffer`、`useStreamStatusScheduler`、`useChatScrollControl`、`useCopyFeedback`），由 `hooks/index.ts` 统一导出。
- `chat-panel/constants/*`：共享常量与配置入口（`chatConversationCommon`、`chatSettings`），由 `constants/index.ts` 统一导出。
- `chat-panel/chatStreamDraftRetention.ts`：中断后草稿保留判定工具，负责历史消息对齐与去重策略。

后续扩展点：

- 新增设置项时优先改 `chatSettings.ts` + `ChatSettingsDialog.tsx`，避免触碰流式主流程。
- 新增流式阶段时优先改 `useStreamStatusScheduler.ts` 与 `ChatMessagesList.tsx` 的阶段展示映射。
- 新增消息块渲染能力（例如更多 citation 展示样式）时优先改 `ChatMessageItem.tsx` / `AssistantMarkdown.tsx`。

## 最小人工回归清单（2.2 / 3.2）

执行前置条件：

- 使用一个存在 `chatId` 的笔记本会话页。
- 至少选择一个可用来源（用于触发检索与回答）。
- 保持网络正常，避免后端不可用引入噪音。

Checklist（最小覆盖）：

- [x] 发送消息：输入普通问题并发送，期望出现“用户消息 + assistant 占位消息”，随后流式填充回答，输入框清空。
- [x] 流式状态：发送后观察状态文案，期望按检索/思考/回答阶段切换；回答阶段不再显示检索/思考文案。
- [x] 中断回复：流式进行中点击停止按钮，期望按钮可用、状态切为“正在终止...”，随后流结束且页面无崩溃。
- [x] 清空上下文：非流式状态点击“刷新”，期望按钮进入 loading 态并完成请求；流式中点击则提示不可清空。
- [x] 设置弹窗：打开设置弹窗，切换对话风格与回答长度并保存，期望弹窗关闭，主聊天流程不受影响。

通过标准：

- 上述 5 项全部通过，且无新增错误提示（除预期文案外）。
- 执行后重新发送一条消息，确认仍可正常流式返回。

## 轻量测试补充（已完成）

- 测试框架：`vitest`（`pnpm test`）。
- 新增测试文件：
  - `src/components/notebook-workspace/chat-panel/chatStreamDraftRetention.test.ts`
  - `src/components/notebook-workspace/chat-panel/chatConversationCommon.test.ts`
- 覆盖范围：
  - 中断流式后本地 assistant 草稿保留/去重策略（防止中断后已输出内容消失）。
  - 流式 action 归一化、finish reason 提示映射、citation 转换与去重合并逻辑。
- 结果：当前 9 个用例通过。

## Open Questions

- 设置弹窗后续是否会演进为跨页面复用能力（决定是否上移到更通用目录）。
