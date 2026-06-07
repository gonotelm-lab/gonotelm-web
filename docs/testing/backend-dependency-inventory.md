# Web 测试后端依赖盘点（迁移基线）

## 当前测试命令

- `pnpm test:unit`：Vitest 单元与组合测试。
- `pnpm test:unit:watch`：Vitest watch 模式。
- `pnpm test:ci`：CI 场景执行 mock 驱动测试。

## 真实后端依赖点（按模块分组）

### 1) Notebook 启动链路

- `src/api/notebook.ts`
  - `GET /api/v1/notebook/list`
  - `GET /api/v1/notebook/:id`
  - `POST /api/v1/notebook/:id/chat`
  - `GET /api/v1/notebook/:id/source/list`

### 2) Chat 会话链路

- `src/api/chat.ts`
  - `POST /api/v1/chat/:id/message/create`
  - `GET /api/v1/chat/:id/message/list`
  - `POST /api/v1/chat/:id/stream/abort`
  - `DELETE /api/v1/chat/:id/context`
  - `GET /api/v1/chat/:id/stream`（SSE）

### 3) Source 管理链路

- `src/api/source.ts`
  - `POST /api/v1/source`
  - `GET /api/v1/source/:id`
  - `POST /api/v1/source/:id/file/upload`
  - `POST /api/v1/source/:id/status`
  - `POST /api/v1/source/:id/reload`
  - `PUT /api/v1/source/:id/title`
  - `DELETE /api/v1/source/:id`

## 已迁移到 mock 驱动的关键路径

- Notebook 首页加载与工作区初始化：
  - `src/api/notebook.mock.test.ts`
- Chat 历史与发消息创建任务：
  - `src/api/chat.mock.test.ts`
- Source 创建与状态轮询：
  - `src/api/source.mock.test.ts`

## 后续迁移优先级

1. 补齐 `stream` SSE 场景化 mock（正常流、中断、重连）。
2. 补齐 `GET /source/:id`（含 `download=true`）的空内容和错误分支回归。
3. 对高频 API 调用（创建/删除来源、重命名、清上下文）继续补齐 mock 场景。
