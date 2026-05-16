## ADDED Requirements

### Requirement: ChatPanel SHALL use modular component boundaries
`ChatPanel` SHALL 作为编排容器，核心职责（设置弹窗渲染、流式会话处理、滚动/复制等交互逻辑）必须拆分到独立子组件或 hooks 中，以降低单文件耦合度。

#### Scenario: Split responsibilities into dedicated modules
- **WHEN** 开发者查看 `ChatPanel` 重构后的实现
- **THEN** 必须可以识别出独立的设置弹窗模块与流式处理模块，且不再把这些逻辑完整内联在同一文件中

### Requirement: ChatPanel modularization SHALL preserve existing behavior
模块拆分后，聊天面板对用户可见行为 MUST 与重构前保持一致，包括发送消息、流式状态更新、中断回复、清空上下文、设置弹窗开关与保存交互。

#### Scenario: Keep chat interaction behavior unchanged
- **WHEN** 用户执行发送、流式接收、中断、清空上下文与打开/关闭设置弹窗操作
- **THEN** 页面行为、交互路径与错误反馈 MUST 与重构前保持一致，不引入新增步骤或功能回归

### Requirement: Settings configuration UI SHALL remain extensible after split
设置弹窗模块 MUST 提供清晰的受控输入边界（当前为对话风格与回答长度），并支持后续以最小改动接入接口持久化。

#### Scenario: Add future settings without editing chat flow internals
- **WHEN** 后续新增一个设置项（例如新风格选项）
- **THEN** 变更应主要发生在设置弹窗模块内，而不需要修改流式会话处理逻辑
