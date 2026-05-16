## Why

当前 `web` 测试强依赖真实后端接口，导致开发阶段无法稳定执行单元测试和组合型集成测试，反馈周期长且经常受环境波动影响。需要一套可本地运行、可重复、可回归的接口 mock 测试机制来保证改动质量。

## What Changes

- 新增前端 API mock 能力：在测试环境中以可配置方式替换真实接口，支持成功态、异常态、慢响应等场景。
- 建立测试分层策略：单元测试默认不触网，组件/组合测试通过 mock server 驱动，避免依赖真实后端。
- 统一测试入口与文档：提供标准化命令、样例和约束，降低新测试编写成本。

## Capabilities

### New Capabilities
- `frontend-api-mocking`: 为前端测试提供统一的接口 mock 框架与场景化响应能力，确保测试可离线执行。

### Modified Capabilities
- 无

## Impact

- Affected code: `web/src` 下依赖网络请求的 hooks、services、组件测试与测试工具初始化代码。
- Affected tooling: 测试运行配置（Vitest）、mock handlers 目录结构、CI 测试步骤。
- Affected process: 开发自测流程从“依赖后端联调”转为“本地 mock 回归”优先。
- Dependencies: 引入并强化 `msw`（API mock）能力。
