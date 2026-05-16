# Web 测试分层与 Mock 规范

## 目标

- 单元/组合测试默认不依赖真实后端。
- 每次改动后可在本地和 CI 稳定执行 mock 驱动回归。

## 测试分层

1. **单元测试（Vitest）**
   - 面向函数、hook、轻量模块行为。
   - 必须运行在 mock 网络环境下。
2. **组合测试（Vitest + MSW）**
   - 面向跨模块 API 协作链路（Notebook/Chat/Source）。
   - 场景覆盖至少包含：`success`、`empty`、`server-error`、`timeout`。

## Mock 目录规范

- `src/test/setup.ts`：Vitest 全局测试入口。
- `src/test/mocks/scenarios.ts`：场景切换控制。
- `src/test/mocks/fixtures/*`：可复用测试数据工厂。
- `src/test/mocks/handlers/*`：按业务域拆分 handler。

## 场景命名约定

- `success`：正常业务路径。
- `empty`：空数据/空态路径。
- `server-error`：服务异常路径（5xx）。
- `timeout`：超时类路径（504）。

## Fail-Fast 规则

- 在 `src/test/setup.ts` 中已启用 `onUnhandledRequest` 报错。
- 新增测试若触发未声明请求，必须补对应 mock handler，不可放行真实网络。

## 常见陷阱

- **陷阱 1：** fixture 写死字段导致跨测试耦合  
  **建议：** 使用工厂函数并在测试内按需覆盖字段。
- **陷阱 2：** 仅覆盖 success 场景，遗漏异常分支  
  **建议：** 每条关键 API 至少补一条 `server-error` 或 `timeout` 断言。
- **陷阱 3：** 手工 mock 数据分散，难维护  
  **建议：** 固化 fixtures 工厂并集中维护 handler。

## 常用命令

- `npm run test:unit`：运行 Vitest。
- `npm run test:unit:watch`：本地 watch 迭代。
- `npm run test:ci`：CI 推荐流程。
