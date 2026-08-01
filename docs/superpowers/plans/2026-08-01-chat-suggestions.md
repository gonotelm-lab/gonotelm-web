# Chat Suggestions Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 gonotelm-web 中适配后端建议生成接口 `GET /api/v1/chats/:chatId/suggestions`，在 ChatComposer 输入框下方展示最多 3 条建议（圆角按钮、撑满宽度、省略号 + hover 全文），点击直接发送；opener 在首个来源 ready 后拉取，followup 在每次回答正常完成后拉取。

**Architecture:** 三层结构 — `api/chat.ts` 新增 `getChatSuggestions`；新 hook `useChatSuggestions` 管理建议状态与两种触发时机（opener 靠 `readySourceIds` 首次空→非空跃迁，followup 靠 `useChatConversation` 新增的 `onStreamCompleted` 回调）；新组件 `ChatSuggestions` 渲染按钮行，`ChatComposer` 透传 props，`ChatPanel` 与 `NotebookWorkspacePage` 接线。建议始终显示当前拉取结果，直到下次拉取替换；失败静默保留旧建议。

**Tech Stack:** React 19、MUI v9、@tanstack/react-query、vitest 4 + react-test-renderer + msw 2、pnpm。

## Global Constraints

- 只改前端 `gonotelm-web`，不动后端。所有路径相对 `/home/ryan/codes/indie/projects-go-1.21/gonotelm-lab/gonotelm-web/`。
- **工作区存在与本次任务无关的未提交改动**（`src/lib/http.ts` 与 5 个 mock handlers 的 204 处理重构）。提交时**只 stage 本任务新建/修改的文件**，绝不 `git add -A`，绝不提交上述无关文件。
- 样式只用共享令牌：`workspaceSpace` / `workspaceRadius` / `workspaceType`（来自 `src/components/notebook-workspace/shared/ui/`），禁止魔数。
- UI 文案中文，代码标识符英文；不新增任何依赖。
- 测试命令：单文件 `pnpm exec vitest run <file>`；类型检查 `pnpm exec tsc -b`；lint `pnpm lint`；全量 `pnpm test`。
- 测试环境 `environment: 'node'`，msw 拦截全部请求，未声明请求会抛错；组件/布局测试用 `renderToStaticMarkup` 或 `react-test-renderer` + `act`。
- 提交信息用 conventional 格式（`feat(web):` / `test(web):` / `docs(web):`），每个任务末尾单独提交。

---

### Task 1: API 层 — `getChatSuggestions` + 类型 + msw mock + 测试

**Files:**
- Modify: `src/types/api.ts`（`ChatListMessagesResponse` 定义之后插入）
- Modify: `src/api/chat.ts:136-140`（`deleteChatContext` 之后插入）
- Modify: `src/test/mocks/fixtures/chat.ts`
- Create: `src/test/mocks/handlers/chatSuggestionsHandlers.ts`
- Modify: `src/test/mocks/handlers/index.ts`
- Test: `src/api/chat.mock.test.ts`

**Interfaces:**
- Produces: `getChatSuggestions(params: { id: string; source_ids?: string[] }) => Promise<ChatGetSuggestionsResponse>`；`ChatGetSuggestionsResponse { type: string; questions: string[] }`。Task 2 的 hook 依赖此函数，Task 3 之后所有 hook 测试经 msw 复用此 mock。

- [ ] **Step 1: 写失败测试**

在 `src/api/chat.mock.test.ts` 中，import 行加 `getChatSuggestions`，并在文件末尾新增两个用例：

```ts
  it('fetches chat suggestions with source ids', async () => {
    const result = await getChatSuggestions({ id: 'chat-1', source_ids: ['source-1', 'source-2'] })

    expect(result.type).toBe('opener')
    expect(result.questions).toHaveLength(3)
  })

  it('returns empty questions under empty scenario', async () => {
    setMockScenario('chat', 'empty')

    const result = await getChatSuggestions({ id: 'chat-1', source_ids: ['source-1'] })

    expect(result.questions).toEqual([])
  })
```

（`setMockScenario` 已 import，无需改。）

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/api/chat.mock.test.ts`
Expected: FAIL — `getChatSuggestions is not defined`（函数尚不存在）。

- [ ] **Step 3: 实现类型、函数、fixture、mock handler**

`src/types/api.ts`，在 `ChatListMessagesResponse` 接口（约 416-421 行）之后插入：

```ts
export interface ChatGetSuggestionsResponse {
  type: string
  questions: string[]
}
```

`src/api/chat.ts`：顶部类型 import 加入 `ChatGetSuggestionsResponse`（与 `ChatListMessagesResponse` 同行风格）：

```ts
import type {
  ApiResult,
  ChatAbortStreamRequest,
  ChatCreateMessageRequest,
  ChatCreateMessageResponse,
  ChatGetSuggestionsResponse,
  ChatListMessagesResponse,
  StreamHeartbeatEvent,
  StreamTaskEvent,
} from '../types/api'
```

`deleteChatContext` 函数之后新增：

```ts
interface GetChatSuggestionsParams {
  id: string
  source_ids?: string[]
}

export function getChatSuggestions(params: GetChatSuggestionsParams) {
  const query = new URLSearchParams()
  for (const sourceId of params.source_ids ?? []) {
    query.append('source_ids', sourceId)
  }
  const queryString = query.toString()
  const chatId = encodeURIComponent(params.id)
  const url = queryString
    ? `/api/v1/chats/${chatId}/suggestions?${queryString}`
    : `/api/v1/chats/${chatId}/suggestions`
  return request<ChatGetSuggestionsResponse>(url)
}
```

`src/test/mocks/fixtures/chat.ts`：import 加 `ChatGetSuggestionsResponse`，末尾新增：

```ts
export const createChatGetSuggestionsResponseFixture = (
  overrides: Partial<ChatGetSuggestionsResponse> = {},
): ChatGetSuggestionsResponse => ({
  type: 'opener',
  questions: ['什么是 Rust 的所有权？', '如何避免借用检查错误？', 'Rust 与 C++ 相比有什么优势？'],
  ...overrides,
})
```

新建 `src/test/mocks/handlers/chatSuggestionsHandlers.ts`：

```ts
import { http } from 'msw'
import { createChatGetSuggestionsResponseFixture } from '../fixtures/chat'
import { getMockScenario } from '../scenarios'
import { resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

export const chatSuggestionsHandlers = [
  http.get(`${apiBaseUrl}/api/v1/chats/:chatId/suggestions`, async () => {
    const scenario = getMockScenario('chat')
    return resolveScenarioResponse({
      scenario,
      successData: createChatGetSuggestionsResponseFixture(),
      emptyData: createChatGetSuggestionsResponseFixture({ questions: [] }),
    })
  }),
]
```

`src/test/mocks/handlers/index.ts`：

```ts
import { chatHandlers } from './chatHandlers'
import { chatSuggestionsHandlers } from './chatSuggestionsHandlers'
import { notebookHandlers } from './notebookHandlers'
import { sourceHandlers } from './sourceHandlers'
import { studioHandlers } from './studioHandlers'

export const handlers = [
  ...notebookHandlers,
  ...chatHandlers,
  ...chatSuggestionsHandlers,
  ...sourceHandlers,
  ...studioHandlers,
]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm exec vitest run src/api/chat.mock.test.ts`
Expected: PASS（全部用例，含新增两个）。

- [ ] **Step 5: 类型检查 + lint + 提交**

Run: `pnpm exec tsc -b && pnpm lint`
Expected: 无错误（注意：`src/test/mocks/handlers/chatHandlers.ts` 的既有未提交改动会一起被 lint 覆盖，无需处理）。

```bash
git add src/types/api.ts src/api/chat.ts src/test/mocks/fixtures/chat.ts src/test/mocks/handlers/chatSuggestionsHandlers.ts src/test/mocks/handlers/index.ts src/api/chat.mock.test.ts
git commit -m "feat(web): add chat suggestions api client with mock"
```

---

### Task 2: `useChatSuggestions` hook — opener/followup 触发逻辑

**Files:**
- Create: `src/components/notebook-workspace/panel/chat/useChatSuggestions.ts`
- Test: `src/components/notebook-workspace/panel/chat/useChatSuggestions.test.tsx`

**Interfaces:**
- Consumes: `getChatSuggestions({ id, source_ids })`（Task 1）。
- Produces:
  - `useChatSuggestions({ chatId: string; readySourceIds: string[]; selectedSourceIds: string[] }): { suggestions: string[]; fetchFollowup: () => void }`
  - `suggestions` 最多 3 条；无则 `[]`。`fetchFollowup` 稳定引用（仅依赖 `chatId`）。Task 5 的 ChatPanel 依赖此签名。

- [ ] **Step 1: 写失败测试**

新建 `src/components/notebook-workspace/panel/chat/useChatSuggestions.test.tsx`：

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { getChatSuggestions } from '@/api/chat'
import { useChatSuggestions } from './useChatSuggestions'

vi.mock('@/api/chat', () => ({
  getChatSuggestions: vi.fn(),
}))

const mockGetChatSuggestions = vi.mocked(getChatSuggestions)

function SuggestionsHarness({
  chatId,
  readySourceIds,
  selectedSourceIds,
}: {
  chatId: string
  readySourceIds: string[]
  selectedSourceIds: string[]
}) {
  const { suggestions, fetchFollowup } = useChatSuggestions({
    chatId,
    readySourceIds,
    selectedSourceIds,
  })
  return (
    <div>
      <span data-testid="suggestions">{suggestions.join('|')}</span>
      <button type="button" data-testid="followup" onClick={fetchFollowup} />
    </div>
  )
}

const readSuggestions = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'suggestions' }).props.children as string

describe('useChatSuggestions', () => {
  it('fetches opener once on the first empty-to-nonempty ready transition and caps at 3', async () => {
    mockGetChatSuggestions.mockResolvedValue({
      type: 'opener',
      questions: ['q1', 'q2', 'q3', 'q4'],
    })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })

    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
    expect(mockGetChatSuggestions).toHaveBeenCalledWith({ id: 'chat-1', source_ids: ['s1'] })
    expect(readSuggestions(renderer)).toBe('q1|q2|q3')

    await act(async () => {
      renderer.update(
        <SuggestionsHarness
          chatId="chat-1"
          readySourceIds={['s1', 's2']}
          selectedSourceIds={['s1', 's2']}
        />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
  })

  it('does not fetch opener when sources are already ready on mount', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'opener', questions: ['q1'] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    await act(async () => {})
    expect(mockGetChatSuggestions).not.toHaveBeenCalled()
    expect(readSuggestions(renderer)).toBe('')
  })

  it('does not fetch when chatId is empty', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'opener', questions: ['q1'] })
    act(() => {
      create(<SuggestionsHarness chatId="" readySourceIds={['s1']} selectedSourceIds={['s1']} />)
    })
    await act(async () => {})
    expect(mockGetChatSuggestions).not.toHaveBeenCalled()
  })

  it('fetches followup suggestions via fetchFollowup with the latest selected sources', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'follow_up', questions: ['f1', 'f2'] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={['s1']} />,
      )
    })
    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'followup' }).props.onClick()
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
    expect(mockGetChatSuggestions).toHaveBeenCalledWith({ id: 'chat-1', source_ids: ['s1'] })
    expect(readSuggestions(renderer)).toBe('f1|f2')
  })

  it('clears suggestions when a fetch resolves with empty questions', async () => {
    mockGetChatSuggestions
      .mockResolvedValueOnce({ type: 'opener', questions: ['q1'] })
      .mockResolvedValueOnce({ type: 'follow_up', questions: [] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })
    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(readSuggestions(renderer)).toBe('q1')

    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'followup' }).props.onClick()
    })
    expect(readSuggestions(renderer)).toBe('')
  })

  it('keeps existing suggestions when a fetch fails', async () => {
    mockGetChatSuggestions
      .mockResolvedValueOnce({ type: 'opener', questions: ['q1'] })
      .mockRejectedValueOnce(new Error('mock failure'))
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })
    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(readSuggestions(renderer)).toBe('q1')

    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'followup' }).props.onClick()
    })
    expect(readSuggestions(renderer)).toBe('q1')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/useChatSuggestions.test.tsx`
Expected: FAIL — `Cannot find module './useChatSuggestions'`。

- [ ] **Step 3: 实现 hook**

新建 `src/components/notebook-workspace/panel/chat/useChatSuggestions.ts`：

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { getChatSuggestions } from '@/api/chat'

const maxSuggestionCount = 3

interface UseChatSuggestionsParams {
  chatId: string
  readySourceIds: string[]
  selectedSourceIds: string[]
}

interface UseChatSuggestionsResult {
  suggestions: string[]
  fetchFollowup: () => void
}

export function useChatSuggestions({
  chatId,
  readySourceIds,
  selectedSourceIds,
}: UseChatSuggestionsParams): UseChatSuggestionsResult {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const openerTriggeredRef = useRef(false)
  const readySeenRef = useRef<boolean | null>(null)
  const selectedSourceIdsRef = useRef(selectedSourceIds)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    selectedSourceIdsRef.current = selectedSourceIds
  }, [selectedSourceIds])

  const fetchSuggestions = useCallback(
    async (sourceIds: string[]) => {
      if (!chatId || sourceIds.length === 0) return
      try {
        const result = await getChatSuggestions({ id: chatId, source_ids: sourceIds })
        if (mountedRef.current) {
          setSuggestions(result.questions.slice(0, maxSuggestionCount))
        }
      } catch (error) {
        console.warn('fetch chat suggestions failed', error)
      }
    },
    [chatId],
  )

  useEffect(() => {
    if (!chatId) return
    const hasReadySources = readySourceIds.length > 0
    const transitionedFromEmpty =
      readySeenRef.current !== null && !readySeenRef.current && hasReadySources
    readySeenRef.current = hasReadySources
    if (openerTriggeredRef.current || !transitionedFromEmpty) return
    openerTriggeredRef.current = true
    void fetchSuggestions(readySourceIds)
  }, [chatId, readySourceIds, fetchSuggestions])

  const fetchFollowup = useCallback(() => {
    void fetchSuggestions(selectedSourceIdsRef.current)
  }, [fetchSuggestions])

  return {
    suggestions,
    fetchFollowup,
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/useChatSuggestions.test.tsx`
Expected: PASS（6 个用例）。

- [ ] **Step 5: 类型检查 + lint + 提交**

Run: `pnpm exec tsc -b && pnpm lint`
Expected: 无错误。

```bash
git add src/components/notebook-workspace/panel/chat/useChatSuggestions.ts src/components/notebook-workspace/panel/chat/useChatSuggestions.test.tsx
git commit -m "feat(web): add useChatSuggestions hook with opener and followup triggers"
```

---

### Task 3: `useChatConversation` — `onStreamCompleted` 回调 + `sendPrompt`

**Files:**
- Modify: `src/components/notebook-workspace/panel/chat/chatConversationCommon.ts`
- Test: `src/components/notebook-workspace/panel/chat/chatConversationCommon.test.ts`
- Modify: `src/components/notebook-workspace/panel/chat/useChatConversation.ts`

**Interfaces:**
- Produces:
  - `shouldFireStreamCompleted(finished: boolean, aborted: boolean): boolean`（chatConversationCommon.ts 导出）
  - `useChatConversation` 新增参数 `onStreamCompleted?: () => void`，新增返回值 `sendPrompt: (prompt: string) => void`。Task 5 的 ChatPanel 依赖此签名。

- [ ] **Step 1: 写失败测试**

`src/components/notebook-workspace/panel/chat/chatConversationCommon.test.ts`：import 加 `shouldFireStreamCompleted`，文件末尾新增：

```ts
describe('shouldFireStreamCompleted', () => {
  it('fires only when the stream finished without user abort', () => {
    expect(shouldFireStreamCompleted(true, false)).toBe(true)
    expect(shouldFireStreamCompleted(true, true)).toBe(false)
    expect(shouldFireStreamCompleted(false, false)).toBe(false)
    expect(shouldFireStreamCompleted(false, true)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/chatConversationCommon.test.ts`
Expected: FAIL — `shouldFireStreamCompleted is not a function`。

- [ ] **Step 3: 实现 helper + hook 改动**

`src/components/notebook-workspace/panel/chat/chatConversationCommon.ts`，在 `copyFeedbackVisibleMs` 常量附近新增：

```ts
/** 流式会话正常完成（收到终止事件且未被用户中止）时才应触发后续动作 */
export const shouldFireStreamCompleted = (finished: boolean, aborted: boolean): boolean =>
  finished && !aborted
```

`src/components/notebook-workspace/panel/chat/useChatConversation.ts`，共 7 处改动：

1. import 区加 `shouldFireStreamCompleted`（从 `./chatConversationCommon` 的既有 import 列表中加入）：
```ts
import {
  chatMessagesPageLimit,
  getErrorMessage,
  isStreamTerminalEvent,
  shouldFireStreamCompleted,
  shouldFlushStreamEventImmediately,
  shouldFlushStreamEventOnNextFrame,
  sleep,
  streamReconnectDelayMs,
  streamReconnectMaxRetries,
  streamUiFlushIntervalMs,
} from './chatConversationCommon'
```

2. `UseChatConversationParams` 接口加字段：
```ts
interface UseChatConversationParams {
  chatId: string
  selectedSourceIds: string[]
  chatStyle: ChatStyleOption
  answerLength: ChatAnswerLengthOption
  enableThinking: boolean
  onStreamCompleted?: () => void
}
```

3. `UseChatConversationResult` 接口加字段（`smoothScrollToBottom` 之后）：
```ts
  smoothScrollToBottom: () => void
  sendPrompt: (prompt: string) => void
```

4. 函数解构加参数（`enableThinking` 之后）：
```ts
export function useChatConversation({
  chatId,
  selectedSourceIds,
  chatStyle,
  answerLength,
  enableThinking,
  onStreamCompleted,
}: UseChatConversationParams): UseChatConversationResult {
```

5. `const streamRunTokenRef = useRef(0)` 之后新增 ref：
```ts
  const onStreamCompletedRef = useRef(onStreamCompleted)
  useEffect(() => {
    onStreamCompletedRef.current = onStreamCompleted
  }, [onStreamCompleted])
```

6. `runStreamSession` 收尾段（当前为 `cancelLiveMessageFlush()` 之后的整个收尾，约 503-518 行）改为：
```ts
      cancelLiveMessageFlush()

      if (runToken !== streamRunTokenRef.current) {
        return
      }

      const streamWasAborted = abortRequestedRef.current
      setActiveTaskId(null)
      setActiveAssistantMessageId(null)
      clearStreamStatusSchedule()
      setStreamStatus('')
      setStreamPhaseType(null)
      resetLastStreamStatusAt()
      resetStreamAbortController()
      setAbortRequestedFlag(false)
      const preserveAssistantDraftOnAbort = abortRequestedRef.current
      await refreshHistoryAfterStream({ preserveAssistantDraftOnAbort })
      if (shouldFireStreamCompleted(finished, streamWasAborted)) {
        onStreamCompletedRef.current?.()
      }
    },
```

7. `handleSendMessage`（约 537 行）签名改为 `const handleSendMessage = useCallback(async (promptOverride?: string) => {`，其中 `const prompt = composerValue.trimEnd()` 改为：
```ts
    const prompt = (promptOverride ?? composerValue).trimEnd()
```
（`if (!prompt.trim()) return` 等其余逻辑不动。）

8. `onSendMessage` 定义之后新增 `sendPrompt`：
```ts
  const sendPrompt = useCallback((prompt: string) => {
    void handleSendMessage(prompt)
  }, [handleSendMessage])
```

9. return 对象加 `sendPrompt`：
```ts
    smoothScrollToBottom,
    sendPrompt,
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/chatConversationCommon.test.ts`
Expected: PASS。

- [ ] **Step 5: 类型检查 + lint + 提交**

Run: `pnpm exec tsc -b && pnpm lint`
Expected: 无错误（`sendPrompt` 目前在 `UseChatConversationResult` 中为必填，Task 5 会接入；若 `noUnusedLocals` 报 `sendPrompt` 未使用，属预期，Task 5 接线后消失 —— 如有报错先跳过，Task 5 完成后统一跑全量检查）。

```bash
git add src/components/notebook-workspace/panel/chat/chatConversationCommon.ts src/components/notebook-workspace/panel/chat/chatConversationCommon.test.ts src/components/notebook-workspace/panel/chat/useChatConversation.ts
git commit -m "feat(web): add stream completion callback and sendPrompt to chat conversation"
```

---

### Task 4: `ChatSuggestions` 组件 + `ChatComposer` 透传

**Files:**
- Create: `src/components/notebook-workspace/panel/chat/ChatSuggestions.tsx`
- Test: `src/components/notebook-workspace/panel/chat/ChatSuggestions.test.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatComposer.tsx`

**Interfaces:**
- Produces:
  - `ChatSuggestions({ suggestions: string[]; disabled?: boolean; onSelect?: (question: string) => void }): JSX.Element | null` — 空列表返回 `null`；最多渲染 3 条。
  - `ChatComposer` 新增 props：`suggestions?: string[]`、`suggestionsDisabled?: boolean`、`onSuggestionSelect?: (question: string) => void`。
- Consumes: `workspaceSpace` / `workspaceRadius` / `workspaceType`。

- [ ] **Step 1: 写失败测试**

新建 `src/components/notebook-workspace/panel/chat/ChatSuggestions.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ChatSuggestions } from './ChatSuggestions'

describe('ChatSuggestions', () => {
  it('renders at most 3 suggestions and hides the rest', () => {
    const html = renderToStaticMarkup(
      <ChatSuggestions
        suggestions={['建议一', '建议二', '建议三', '建议四']}
        onSelect={() => undefined}
      />,
    )

    expect(html).toContain('建议一')
    expect(html).toContain('建议三')
    expect(html).not.toContain('建议四')
  })

  it('renders nothing when suggestions are empty', () => {
    const html = renderToStaticMarkup(<ChatSuggestions suggestions={[]} />)

    expect(html).toBe('')
  })

  it('notifies onSelect with the question when a suggestion is clicked', () => {
    const onSelect = vi.fn()
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(<ChatSuggestions suggestions={['点击我']} onSelect={onSelect} />)
    })

    const button = renderer!.root.findAll(
      (node) => typeof node.props['data-suggestion'] === 'string',
    )[0]
    act(() => {
      button.props.onClick()
    })

    expect(onSelect).toHaveBeenCalledWith('点击我')
  })

  it('disables suggestion buttons while streaming', () => {
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <ChatSuggestions suggestions={['建议一']} disabled onSelect={() => undefined} />,
      )
    })

    const button = renderer!.root.findAll(
      (node) => typeof node.props['data-suggestion'] === 'string',
    )[0]
    expect(button.props.disabled).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/ChatSuggestions.test.tsx`
Expected: FAIL — `Cannot find module './ChatSuggestions'`。

- [ ] **Step 3: 实现组件 + ChatComposer 透传**

新建 `src/components/notebook-workspace/panel/chat/ChatSuggestions.tsx`：

```tsx
import { Box, Button, Tooltip } from '@mui/material'
import { workspaceRadius, workspaceSpace } from '../../shared/ui/layoutTokens'
import { workspaceType } from '../../shared/ui/typeTokens'

const maxSuggestionCount = 3
const suggestionsRowGap = workspaceSpace.sm

interface ChatSuggestionsProps {
  suggestions: string[]
  disabled?: boolean
  onSelect?: (question: string) => void
}

export function ChatSuggestions({
  suggestions,
  disabled = false,
  onSelect,
}: ChatSuggestionsProps) {
  const visibleSuggestions = suggestions.slice(0, maxSuggestionCount)

  if (visibleSuggestions.length === 0) {
    return null
  }

  const renderSuggestion = (question: string) => {
    const button = (
      <Button
        variant="outlined"
        size="small"
        disabled={disabled}
        onClick={() => onSelect?.(question)}
        data-suggestion={question}
        sx={{
          flex: '1 1 0',
          minWidth: 0,
          px: workspaceSpace.sm,
          py: workspaceSpace.xxs,
          borderRadius: workspaceRadius.md,
          textTransform: 'none',
          fontSize: workspaceType.xs,
          lineHeight: 1.35,
          color: 'text.secondary',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          },
        }}
      >
        <Box
          component="span"
          data-testid="chat-suggestion-text"
          sx={{
            display: 'block',
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            textAlign: 'center',
          }}
        >
          {question}
        </Box>
      </Button>
    )
    if (disabled) {
      return button
    }
    return (
      <Tooltip key={question} title={question} placement="top">
        {button}
      </Tooltip>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        gap: suggestionsRowGap,
        width: '100%',
        mt: workspaceSpace.sm,
      }}
    >
      {visibleSuggestions.map(renderSuggestion)}
    </Box>
  )
}
```

`src/components/notebook-workspace/panel/chat/ChatComposer.tsx` 全量替换为：

```tsx
import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { Box } from '@mui/material'
import { workspaceLayout } from '../../shared/ui/layoutTokens'
import { ChatInputBox, type ChatInputInteractionState } from './ChatInputBox'
import { ChatSuggestions } from './ChatSuggestions'

const composerMarginTop = workspaceLayout.panelPaddingY

interface ChatComposerProps {
  value: string
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>
  interactionState: ChatInputInteractionState
  suggestions?: string[]
  suggestionsDisabled?: boolean
  leftControlsExtra?: ReactNode
  rightControlsExtra?: ReactNode
  onValueChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSend: () => void
  onAbort: () => void
  onSuggestionSelect?: (question: string) => void
}

export function ChatComposer({
  value,
  inputRef,
  interactionState,
  suggestions = [],
  suggestionsDisabled = false,
  leftControlsExtra,
  rightControlsExtra,
  onValueChange,
  onKeyDown,
  onSend,
  onAbort,
  onSuggestionSelect,
}: ChatComposerProps) {
  return (
    <Box sx={{ mt: composerMarginTop }}>
      <ChatInputBox
        value={value}
        inputRef={inputRef}
        onValueChange={onValueChange}
        onKeyDown={onKeyDown}
        interactionState={interactionState}
        leftControlsExtra={leftControlsExtra}
        rightControlsExtra={rightControlsExtra}
        onSend={onSend}
        onAbort={onAbort}
      />
      <ChatSuggestions
        suggestions={suggestions}
        disabled={suggestionsDisabled}
        onSelect={onSuggestionSelect}
      />
    </Box>
  )
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/ChatSuggestions.test.tsx`
Expected: PASS（4 个用例）。

- [ ] **Step 5: 类型检查 + lint + 提交**

Run: `pnpm exec tsc -b && pnpm lint`
Expected: 无错误。

```bash
git add src/components/notebook-workspace/panel/chat/ChatSuggestions.tsx src/components/notebook-workspace/panel/chat/ChatSuggestions.test.tsx src/components/notebook-workspace/panel/chat/ChatComposer.tsx
git commit -m "feat(web): render chat suggestion buttons below composer input"
```

---

### Task 5: `ChatPanel` / `NotebookWorkspacePage` 接线

**Files:**
- Modify: `src/components/notebook-workspace/panel/chat/ChatPanel.tsx`
- Modify: `src/pages/NotebookWorkspacePage.tsx:1408-1421`
- Test: `src/components/notebook-workspace/panel/chat/ChatPanel.layout.test.tsx`

**Interfaces:**
- Consumes: `useChatSuggestions`（Task 2）、`useChatConversation` 的 `onStreamCompleted` / `sendPrompt`（Task 3）、`ChatComposer` 新 props（Task 4）。
- Produces: `ChatPanel` 新增必填 prop `readySourceIds: string[]`。

- [ ] **Step 1: 写失败测试**

`src/components/notebook-workspace/panel/chat/ChatPanel.layout.test.tsx`：

1. `vi.mock('./useChatConversation', ...)` 的返回值对象中，`smoothScrollToBottom: () => undefined,` 之后加一行：
```ts
    sendPrompt: () => undefined,
```

2. 新增 mock（放在 `vi.mock('./ChatComposer', ...)` 之后）：
```ts
vi.mock('./useChatSuggestions', () => ({
  useChatSuggestions: () => ({
    suggestions: ['追问建议一', '追问建议二'],
    fetchFollowup: () => undefined,
  }),
}))
```

3. `vi.mock('./ChatComposer', ...)` 改为捕获 suggestions 并渲染出来：
```ts
vi.mock('./ChatComposer', () => ({
  ChatComposer: ({ suggestions }: { suggestions?: string[] }) => (
    <div
      data-testid="chat-composer"
      data-suggestions={JSON.stringify(suggestions ?? [])}
    />
  ),
}))
```

4. 测试用例的 `<ChatPanel ...>` 中，`selectedSourceIds={[]}` 之后加：
```tsx
        readySourceIds={[]}
```

5. 用例末尾断言加：
```ts
    expect(html).toContain('"追问建议一"')
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/ChatPanel.layout.test.tsx`
Expected: FAIL — TS 报 `ChatPanel` 缺少必填 prop `readySourceIds`（vitest 不做类型检查，若运行通过则说明 mock 覆盖了接线，跳到 Step 3 后以 tsc 验证）。

- [ ] **Step 3: 实现接线**

`src/components/notebook-workspace/panel/chat/ChatPanel.tsx`：

1. import 区加：
```ts
import { useChatSuggestions } from './useChatSuggestions'
```

2. `ChatPanelProps` 接口中 `selectedSourceIds: string[]` 之后加：
```ts
  readySourceIds: string[]
```

3. `ChatPanelContent` 解构中 `selectedSourceIds` 之后加 `readySourceIds,`。

4. `useChatConversation({...})` 调用之前（`const [errorToast, setErrorToast] = ...` 附近）加：
```ts
  const { suggestions, fetchFollowup } = useChatSuggestions({
    chatId,
    readySourceIds,
    selectedSourceIds,
  })
```

5. `useChatConversation({` 调用中 `enableThinking,` 之后加：
```ts
    onStreamCompleted: fetchFollowup,
```

6. `useChatConversation` 解构中 `smoothScrollToBottom,` 之后加 `sendPrompt,`。

7. `<ChatComposer ...>` 调用中 `onAbort={onAbortStream}` 之后加：
```tsx
          suggestions={suggestions}
          suggestionsDisabled={isStreaming}
          onSuggestionSelect={sendPrompt}
```

`src/pages/NotebookWorkspacePage.tsx`，`<ChatPanel ...>` 调用（约 1408 行）中 `selectedSourceIds={selectedSourceIdList}` 之后加：

```tsx
              readySourceIds={readySourceIdList}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm exec vitest run src/components/notebook-workspace/panel/chat/ChatPanel.layout.test.tsx`
Expected: PASS，且断言 `html` 包含 `"追问建议一"`。

- [ ] **Step 5: 类型检查 + lint + 全量测试 + 提交**

Run: `pnpm exec tsc -b && pnpm lint && pnpm test`
Expected: 全部通过（全量测试不得破坏既有用例）。

```bash
git add src/components/notebook-workspace/panel/chat/ChatPanel.tsx src/pages/NotebookWorkspacePage.tsx src/components/notebook-workspace/panel/chat/ChatPanel.layout.test.tsx
git commit -m "feat(web): wire chat suggestions into chat panel and workspace"
```

---

## Self-Review

- **Spec coverage：**
  - API 层与类型（spec「API 层」）→ Task 1
  - `useChatSuggestions` opener 首跃迁 / followup / 失败静默 / 空清空（spec「useChatSuggestions hook」）→ Task 2
  - `onStreamCompleted` 仅正常完成、`sendPrompt` 直发（spec「useChatConversation 改动」）→ Task 3
  - `ChatSuggestions` 圆角按钮、最多 3、撑满、ellipsis、hover Tooltip（spec「ChatComposer / ChatSuggestions 展示」）→ Task 4
  - ChatPanel / NotebookWorkspacePage 接线、`readySourceIds` prop（spec「组件接线」）→ Task 5
  - msw handler + fixture（spec「测试」）→ Task 1；hook 测试 → Task 2；ChatPanel.layout.test 适配 → Task 5
- **Placeholder scan：** 无 TBD/TODO；每步含完整代码与命令。
- **Type consistency：** `getChatSuggestions` 参数名 `{ id, source_ids }` 在 Task 1/2 一致；`useChatSuggestions` 返回 `{ suggestions, fetchFollowup }` 在 Task 2/5 一致；`useChatConversation` 的 `onStreamCompleted` / `sendPrompt` 在 Task 3/5 一致；`ChatSuggestions` props 在 Task 4/5 一致（`onSelect` 可选，ChatComposer 传 `onSuggestionSelect`）。`ChatPanel` 的 `readySourceIds` 在 Task 5 的三处（接口、Page、测试）一致。
- **既有未提交改动：** 所有 task 只触及干净文件；mock handler 单独建 `chatSuggestionsHandlers.ts` 避免污染有未提交改动的 `chatHandlers.ts`；提交命令逐文件 `git add`，无 `git add -A`。
