# Chat API v2 对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 gonotelm-web Chat 模块对齐服务端 fragment-based message v2 与 StreamTaskEvent 流式协议。

**Architecture:** 独立 `streamEventReducer` 纯函数应用 SSE patch；`messageMapper` 转换历史消息；`ChatMessageFragments` 分段渲染 PHASE/THINK/RESPONSE；引用通过 `<sup>idx</sup>` → `citations[idx-1]` 解析。

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest, MSW, MUI

**Spec:** `gonotelm-web/docs/superpowers/specs/2026-07-05-chat-api-v2-alignment-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/types/api.ts` | 新 Chat/Stream 类型，移除旧类型 |
| `src/api/chat.ts` | 更新请求/流消费，移除 enhanced_retrieval |
| `src/components/.../chat/streamEventReducer.ts` | SSE patch reducer |
| `src/components/.../chat/messageMapper.ts` | API message → ChatUiMessage |
| `src/components/.../chat/citationResolver.ts` | doc_id → source doc 探测 |
| `src/components/.../chat/ChatMessageFragments.tsx` | 分段渲染 |
| `src/components/.../chat/types.ts` | ChatUiFragment / ChatUiMessage |
| `src/components/.../chat/chatConversationCommon.ts` | 精简，迁移 mapper/reducer |
| `src/components/.../chat/useChatConversation.ts` | 接入 reducer |
| `src/components/.../chat/ChatMessageItem.tsx` | 组合 Fragments + 引用 |
| `src/components/.../shared/markdown/MarkdownRenderer.tsx` | `<sup>idx</sup>` 正则 |
| `src/components/.../chat/ChatInputBox.tsx` | 移除增强检索 |
| `src/test/mocks/fixtures/chat.ts` | 新 fixture |
| `src/test/mocks/handlers/chatHandlers.ts` | 新 mock 响应 |

---

### Task 1: API 类型定义

**Files:**
- Modify: `src/types/api.ts`

- [ ] **Step 1: 替换 Chat 相关类型**

在 `src/types/api.ts` 中，删除以下旧类型：
- `ChatMessageContent`, `ChatMessageContentText`, `ChatMessageCitation`, `ChatMessageCitationItem`
- `ChatMessageListItem`
- `MessageStreamPhaseType`, `MessageStreamPhaseStatus`, `MessageStreamPhaseContentAction`
- `ChatMessageStreamCitation*`, `ChatMessageStreamPhase`, `ChatMessageStreamEvent`, `ChatMessageStreamFinishReason`
- `ChatCreateMessageRequest.enhanced_retrieval`

新增：

```typescript
export type FragmentType = 'REQUEST' | 'THINK' | 'PHASE' | 'RESPONSE'
export type FragmentStatus = 'RUNNING' | 'FINISHED'

export interface FragmentContentText {
  content: string
}

export interface FragmentContentUnion {
  type: 'text'
  text?: FragmentContentText
}

export interface FragmentRequest {
  content?: FragmentContentUnion
}

export interface FragmentThink {
  status: FragmentStatus
  content?: FragmentContentText
}

export interface FragmentPhase {
  status: FragmentStatus
  summary: string
  thought: string
}

export interface FragmentResponse {
  status: FragmentStatus
  content?: FragmentContentUnion
}

export interface MessageFragment {
  id: number
  type: FragmentType
  request?: FragmentRequest
  think?: FragmentThink
  phase?: FragmentPhase
  response?: FragmentResponse
}

export interface ChatMessage {
  id: string
  create_time: number
  update_time: number
  chat_id: string
  user_id: string
  role: ChatMessageRole
  fragments?: MessageFragment[]
  seq_no: number
  citations?: string[]
}

export type EventAction = 'INIT' | 'APPEND' | 'SET' | 'NEW'
export type EventTargetPath =
  | 'message'
  | 'message.citations'
  | 'message.fragments.think'
  | 'message.fragments.think.content'
  | 'message.fragments.think.status'
  | 'message.fragments.response'
  | 'message.fragments.response.content.text'
  | 'message.fragments.response.status'
  | 'message.fragments.phase'

export interface StreamTaskEventThink {
  status?: FragmentStatus
  content?: string
}

export interface StreamTaskEventResponse {
  status?: FragmentStatus
  content?: FragmentContentUnion
}

export interface StreamTaskEventPhase {
  phase?: FragmentPhase
}

export interface StreamTaskEventError {
  message?: string
}

export interface StreamTaskEvent {
  id: string
  task_id?: string
  create_time?: number
  action: EventAction
  path: EventTargetPath
  index?: number
  message?: ChatMessage
  citations?: string[]
  think?: StreamTaskEventThink
  response?: StreamTaskEventResponse
  phase?: StreamTaskEventPhase
  error?: StreamTaskEventError
}

export interface StreamHeartbeatEvent {
  heartbeat: string
}

export interface ChatListMessagesResponse {
  messages: ChatMessage[]
  limit: number
  has_more: boolean
  next_cursor: number
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd gonotelm-web && npx tsc --noEmit 2>&1 | head -30`
Expected: 出现引用旧类型的错误（后续 task 修复）

---

### Task 2: streamEventReducer

**Files:**
- Create: `src/components/notebook-workspace/panel/chat/streamEventReducer.ts`
- Create: `src/components/notebook-workspace/panel/chat/streamEventReducer.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// streamEventReducer.test.ts
import { describe, expect, it } from 'vitest'
import { applyStreamEvent, createEmptyAssistantMessage } from './streamEventReducer'
import type { StreamTaskEvent } from '@/types/api'

describe('applyStreamEvent', () => {
  it('INIT message creates assistant skeleton', () => {
    const msg = createEmptyAssistantMessage('asst-1')
    const event: StreamTaskEvent = {
      id: '1-0',
      action: 'INIT',
      path: 'message',
      message: {
        id: 'asst-1',
        create_time: 0,
        update_time: 0,
        chat_id: 'chat-1',
        user_id: 'u1',
        role: 'assistant',
        seq_no: 1,
        fragments: [],
      },
    }
    const result = applyStreamEvent(msg, event)
    expect(result.id).toBe('asst-1')
    expect(result.fragments).toEqual([])
  })

  it('APPEND response content text', () => {
    let msg = createEmptyAssistantMessage('asst-1')
    msg = applyStreamEvent(msg, {
      id: '2-0', action: 'NEW', path: 'message.fragments.response', index: -1,
      response: { status: 'RUNNING', content: { type: 'text', text: { content: '' } } },
    })
    msg = applyStreamEvent(msg, {
      id: '3-0', action: 'APPEND', path: 'message.fragments.response.content.text', index: -1,
      response: { content: { type: 'text', text: { content: 'Hello' } } },
    })
    const response = msg.fragments.find((f) => f.type === 'RESPONSE')
    expect(response?.response?.content).toBe('Hello')
  })

  it('SET citations', () => {
    let msg = createEmptyAssistantMessage('asst-1')
    msg = applyStreamEvent(msg, {
      id: '4-0', action: 'SET', path: 'message.citations',
      citations: ['doc-a', 'doc-b'],
    })
    expect(msg.citations).toEqual(['doc-a', 'doc-b'])
  })

  it('NEW phase fragment', () => {
    let msg = createEmptyAssistantMessage('asst-1')
    msg = applyStreamEvent(msg, {
      id: '5-0', action: 'NEW', path: 'message.fragments.phase', index: -1,
      phase: { phase: { status: 'FINISHED', summary: '检索证据', thought: '...' } },
    })
    expect(msg.fragments).toHaveLength(1)
    expect(msg.fragments[0]?.phase?.summary).toBe('检索证据')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd gonotelm-web && npx vitest run src/components/notebook-workspace/panel/chat/streamEventReducer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 reducer**

```typescript
// streamEventReducer.ts
import type { FragmentStatus, StreamTaskEvent } from '@/types/api'
import type { ChatUiFragment, ChatUiMessage } from './types'

export function createEmptyAssistantMessage(id: string): ChatUiMessage {
  return { id, role: 'assistant', fragments: [], citations: [] }
}

function resolveFragmentIndex(fragments: ChatUiFragment[], index?: number): number {
  if (index === undefined) return fragments.length - 1
  if (index < 0) return fragments.length + index
  return index
}

function ensureFragment(msg: ChatUiMessage, type: ChatUiFragment['type'], index: number): ChatUiFragment {
  let fragment = msg.fragments[index]
  if (!fragment || fragment.type !== type) {
    fragment = { id: msg.fragments.length + 1, type }
    msg.fragments.push(fragment)
  }
  return fragment
}

export function applyStreamEvent(msg: ChatUiMessage, event: StreamTaskEvent): ChatUiMessage {
  const next = { ...msg, fragments: [...msg.fragments], citations: [...msg.citations] }

  if (event.error?.message) {
    return next // caller handles error display
  }

  switch (event.path) {
    case 'message':
      if (event.action === 'INIT' && event.message) {
        next.id = event.message.id
      }
      break

    case 'message.citations':
      if (event.action === 'SET' && event.citations) {
        next.citations = event.citations
      }
      break

    case 'message.fragments.think':
      if (event.action === 'NEW') {
        next.fragments.push({
          id: next.fragments.length + 1,
          type: 'THINK',
          think: { status: 'RUNNING', content: '' },
        })
      }
      break

    case 'message.fragments.think.content': {
      const idx = resolveFragmentIndex(next.fragments, event.index)
      const frag = ensureFragment(next, 'THINK', idx)
      if (event.action === 'APPEND' && event.think?.content) {
        frag.think = { ...frag.think!, content: (frag.think?.content ?? '') + event.think.content }
      }
      break
    }

    case 'message.fragments.think.status': {
      const idx = resolveFragmentIndex(next.fragments, event.index)
      const frag = next.fragments[idx]
      if (frag?.think && event.think?.status) {
        frag.think.status = event.think.status
      }
      break
    }

    case 'message.fragments.phase':
      if (event.action === 'NEW' && event.phase?.phase) {
        next.fragments.push({
          id: next.fragments.length + 1,
          type: 'PHASE',
          phase: {
            summary: event.phase.phase.summary,
            thought: event.phase.phase.thought,
          },
        })
      }
      break

    case 'message.fragments.response':
      if (event.action === 'NEW') {
        next.fragments.push({
          id: next.fragments.length + 1,
          type: 'RESPONSE',
          response: { status: 'RUNNING', content: '' },
        })
      }
      break

    case 'message.fragments.response.content.text': {
      const idx = resolveFragmentIndex(next.fragments, event.index)
      const frag = ensureFragment(next, 'RESPONSE', idx)
      const chunk = event.response?.content?.text?.content ?? ''
      if (event.action === 'APPEND' && chunk) {
        frag.response = {
          ...frag.response!,
          content: (frag.response?.content ?? '') + chunk,
        }
      } else if (event.action === 'SET' && chunk) {
        frag.response = { ...frag.response!, content: chunk }
      }
      break
    }

    case 'message.fragments.response.status': {
      const idx = resolveFragmentIndex(next.fragments, event.index)
      const frag = next.fragments[idx]
      if (frag?.response && event.response?.status) {
        frag.response.status = event.response.status
      }
      break
    }
  }

  return next
}

export function extractLatestPhaseSummary(msg: ChatUiMessage): string {
  for (let i = msg.fragments.length - 1; i >= 0; i -= 1) {
    const summary = msg.fragments[i]?.phase?.summary
    if (summary) return summary
  }
  return ''
}

export function extractResponseText(msg: ChatUiMessage): string {
  return msg.fragments
    .filter((f) => f.type === 'RESPONSE')
    .map((f) => f.response?.content ?? '')
    .join('\n')
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd gonotelm-web && npx vitest run src/components/notebook-workspace/panel/chat/streamEventReducer.test.ts`
Expected: PASS (4 tests)

---

### Task 3: messageMapper

**Files:**
- Create: `src/components/notebook-workspace/panel/chat/messageMapper.ts`
- Create: `src/components/notebook-workspace/panel/chat/messageMapper.test.ts`
- Modify: `src/components/notebook-workspace/panel/chat/types.ts`

- [ ] **Step 1: 更新 types.ts**

```typescript
// types.ts — 替换 ChatUiMessage
export type ChatUiFragmentType = 'REQUEST' | 'THINK' | 'PHASE' | 'RESPONSE'

export interface ChatUiFragment {
  id: number
  type: ChatUiFragmentType
  request?: { content: string }
  think?: { status: string; content: string }
  phase?: { summary: string; thought: string }
  response?: { status: string; content: string }
}

export interface ChatUiMessage {
  id: string
  role: 'user' | 'assistant'
  fragments: ChatUiFragment[]
  citations: string[]
}

// ChatUiCitationDetail 保留，marker 改为 `[[idx]]`（1-based）
export interface ChatUiCitationDetail {
  marker: string
  citationIndex: number  // 1-based, 对应 <sup>idx</sup>
  docId: string
  sourceId?: string
  isSummary?: boolean
  position?: ChatUiCitationPosition
}
```

- [ ] **Step 2: 写失败测试**

```typescript
// messageMapper.test.ts
import { describe, expect, it } from 'vitest'
import { mapChatMessageToUi } from './messageMapper'
import type { ChatMessage } from '@/types/api'

describe('mapChatMessageToUi', () => {
  it('maps user REQUEST fragment', () => {
    const msg: ChatMessage = {
      id: 'u1', create_time: 0, update_time: 0, chat_id: 'c1', user_id: 'u',
      role: 'user', seq_no: 1,
      fragments: [{
        id: 1, type: 'REQUEST',
        request: { content: { type: 'text', text: { content: '你好' } } },
      }],
    }
    const ui = mapChatMessageToUi(msg)
    expect(ui.role).toBe('user')
    expect(ui.fragments[0]?.request?.content).toBe('你好')
  })

  it('maps assistant RESPONSE + citations', () => {
    const msg: ChatMessage = {
      id: 'a1', create_time: 0, update_time: 0, chat_id: 'c1', user_id: 'u',
      role: 'assistant', seq_no: 2, citations: ['doc-1'],
      fragments: [{
        id: 1, type: 'RESPONSE',
        response: { status: 'FINISHED', content: { type: 'text', text: { content: '答案<sup>1</sup>' } } },
      }],
    }
    const ui = mapChatMessageToUi(msg)
    expect(ui.citations).toEqual(['doc-1'])
    expect(ui.fragments[0]?.response?.content).toContain('答案')
  })
})
```

- [ ] **Step 3: 实现 mapper**

```typescript
// messageMapper.ts
import type { ChatMessage, MessageFragment } from '@/types/api'
import type { ChatUiFragment, ChatUiMessage } from './types'

function mapFragment(fragment: MessageFragment): ChatUiFragment {
  const base = { id: fragment.id, type: fragment.type }
  switch (fragment.type) {
    case 'REQUEST':
      return { ...base, request: { content: fragment.request?.content?.text?.content ?? '' } }
    case 'THINK':
      return { ...base, think: { status: fragment.think?.status ?? 'FINISHED', content: fragment.think?.content?.content ?? '' } }
    case 'PHASE':
      return { ...base, phase: { summary: fragment.phase?.summary ?? '', thought: fragment.phase?.thought ?? '' } }
    case 'RESPONSE':
      return { ...base, response: { status: fragment.response?.status ?? 'FINISHED', content: fragment.response?.content?.text?.content ?? '' } }
    default:
      return base as ChatUiFragment
  }
}

export function mapChatMessageToUi(message: ChatMessage): ChatUiMessage {
  const role = String(message.role).toLowerCase() === 'user' ? 'user' : 'assistant'
  return {
    id: message.id,
    role,
    fragments: (message.fragments ?? []).map(mapFragment),
    citations: message.citations ?? [],
  }
}

export function buildCitationDetails(citations: string[]): ChatUiCitationDetail[] {
  return citations.map((docId, i) => ({
    marker: `[[${i + 1}]]`,
    citationIndex: i + 1,
    docId,
  }))
}
```

- [ ] **Step 4: 运行测试**

Run: `cd gonotelm-web && npx vitest run src/components/notebook-workspace/panel/chat/messageMapper.test.ts`
Expected: PASS

---

### Task 4: 引用解析器

**Files:**
- Create: `src/components/notebook-workspace/panel/chat/citationResolver.ts`
- Modify: `src/api/source.ts`（若无 batch get 则新增）

- [ ] **Step 1: 新增 batchGetSourceDocs API（如不存在）**

```typescript
// src/api/source.ts
export function batchGetSourceDocs(sourceId: string, docIds: string[]) {
  const query = new URLSearchParams()
  query.set('ids', docIds.join(','))
  return request<{ docs: GetSourceDocResponse[] }>(
    `/api/v1/source/${encodeURIComponent(sourceId)}/batch/docs?${query}`,
  )
}
```

- [ ] **Step 2: 实现 citationResolver**

```typescript
// citationResolver.ts
import { batchGetSourceDocs } from '@/api/source'
import type { GetSourceDocResponse } from '@/types/api'

const docSourceCache = new Map<string, string>()

export async function resolveSourceDoc(
  docId: string,
  candidateSourceIds: string[],
): Promise<GetSourceDocResponse | null> {
  const cachedSourceId = docSourceCache.get(docId)
  if (cachedSourceId) {
    const result = await batchGetSourceDocs(cachedSourceId, [docId])
    return result.docs[0] ?? null
  }

  for (const sourceId of candidateSourceIds) {
    const result = await batchGetSourceDocs(sourceId, [docId])
    if (result.docs.length > 0) {
      docSourceCache.set(docId, sourceId)
      return result.docs[0] ?? null
    }
  }
  return null
}
```

---

### Task 5: MarkdownRenderer 引用格式

**Files:**
- Modify: `src/components/notebook-workspace/shared/markdown/MarkdownRenderer.tsx`

- [ ] **Step 1: 更新正则与 href 格式**

将 `citationPattern` 从：
```typescript
const citationPattern = /<sup>\s*([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\s*<\/sup>/gi
```
改为：
```typescript
const citationPattern = /<sup>\s*(\d+)\s*<\/sup>/gi
```

`transformCitationSuperscript` 中替换逻辑：
```typescript
return segment.replace(citationPattern, (_matched, idx: string) => {
  const citationHref = `#cite-${idx}`
  return `[\\[${idx}\\]](${citationHref})`
})
```

`parseCitationHref` 改为解析 `#cite-{idx}`，返回 `{ citationIndex: idx }`。

更新 `onCitationClick` 签名：`(event, citationIndex: string) => void`（移除 docIndex）。

- [ ] **Step 2: 更新 sanitize schema href 正则**

```typescript
['href', /^#cite-\d+$/],
```

---

### Task 6: ChatMessageFragments 组件

**Files:**
- Create: `src/components/notebook-workspace/panel/chat/ChatMessageFragments.tsx`

- [ ] **Step 1: 实现分段渲染**

```tsx
// ChatMessageFragments.tsx
import { Box, Collapse, Typography } from '@mui/material'
import { AssistantMarkdown } from './AssistantMarkdown'
import type { ChatUiFragment, ChatUiMessage } from './types'

interface Props {
  message: ChatUiMessage
  isStreaming?: boolean
  isActiveAssistant?: boolean
  onCitationClick?: (event: React.MouseEvent<HTMLAnchorElement>, citationIndex: string) => void
}

export function ChatMessageFragments({ message, isStreaming, isActiveAssistant, onCitationClick }: Props) {
  if (message.role === 'user') {
    const text = message.fragments.find((f) => f.type === 'REQUEST')?.request?.content ?? ''
    return <Typography sx={{ whiteSpace: 'pre-wrap' }}>{text}</Typography>
  }

  return (
    <Box>
      {message.fragments.map((fragment) => (
        <FragmentBlock
          key={fragment.id}
          fragment={fragment}
          isStreaming={isStreaming && isActiveAssistant}
          onCitationClick={onCitationClick}
        />
      ))}
    </Box>
  )
}

function FragmentBlock({ fragment, isStreaming, onCitationClick }: {
  fragment: ChatUiFragment
  isStreaming?: boolean
  onCitationClick?: Props['onCitationClick']
}) {
  switch (fragment.type) {
    case 'PHASE':
      return (
        <Box sx={{ py: 0.5, color: 'text.secondary', fontSize: 13.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{fragment.phase?.summary}</Typography>
          {fragment.phase?.thought ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.3 }}>{fragment.phase.thought}</Typography>
          ) : null}
        </Box>
      )
    case 'THINK':
      return (
        <Collapse in>
          <Box sx={{ py: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'divider', color: 'text.secondary', fontSize: 13 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {fragment.think?.status === 'RUNNING' && isStreaming ? '思考中...' : '思考过程'}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.3 }}>{fragment.think?.content}</Typography>
          </Box>
        </Collapse>
      )
    case 'RESPONSE':
      return <AssistantMarkdown content={fragment.response?.content ?? ''} onCitationClick={onCitationClick} />
    default:
      return null
  }
}
```

---

### Task 7: 重构 ChatMessageItem

**Files:**
- Modify: `src/components/notebook-workspace/panel/chat/ChatMessageItem.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/AssistantMarkdown.tsx`

- [ ] **Step 1: 使用 ChatMessageFragments 替换 text 渲染**

- [ ] **Step 2: 引用点击改用 citationIndex + resolveSourceDoc**

```typescript
const handleCitationClick = useCallback(
  (event: MouseEvent<HTMLAnchorElement>, citationIndex: string) => {
    const idx = Number(citationIndex)
    const docId = message.citations[idx - 1]
    if (!docId) { setCitationLoadError('未命中引用映射。'); return }
    // 使用 resolveSourceDoc(docId, candidateSourceIds) 替代旧的 sourceId+docId 直取
    ...
  },
  [message.citations, candidateSourceIds],
)
```

- [ ] **Step 3: 复制功能改用 extractResponseText**

---

### Task 8: 重构 useChatConversation

**Files:**
- Modify: `src/components/notebook-workspace/panel/chat/useChatConversation.ts`
- Modify: `src/components/notebook-workspace/panel/chat/chatConversationCommon.ts`
- Modify: `src/components/notebook-workspace/panel/chat/chatStreamDraftRetention.ts`

- [ ] **Step 1: 更新 api/chat.ts 流事件类型**

```typescript
// chat.ts — onEvent 回调签名
onEvent: (eventType: string, event: StreamTaskEvent | StreamHeartbeatEvent) => void
```

移除 `enhanced_retrieval` from `createChatMessage`.

- [ ] **Step 2: 替换 onEvent 处理逻辑**

```typescript
import { applyStreamEvent, createEmptyAssistantMessage, extractLatestPhaseSummary } from './streamEventReducer'
import { mapChatMessageToUi } from './messageMapper'

// 在 stream runner 中：
let assistantMsg = createEmptyAssistantMessage(assistantMessageId)

onEvent: (eventType, event) => {
  if (eventType === 'heartbeat' || 'heartbeat' in event) return
  const streamEvent = event as StreamTaskEvent
  if (streamEvent.id) lastStreamId = streamEvent.id
  if (streamEvent.error?.message) { setErrorText(streamEvent.error.message); return }
  assistantMsg = applyStreamEvent(assistantMsg, streamEvent)
  updateLiveAssistantMessage(assistantMessageId, assistantMsg)
  const phaseSummary = extractLatestPhaseSummary(assistantMsg)
  if (phaseSummary) setStreamStatus(phaseSummary)
}
```

- [ ] **Step 3: 历史映射改用 mapChatMessageToUi**

在 `chatConversationCommon.ts` 删除 `mapChatItemToUiMessage`，改为从 `messageMapper` 导入。

更新 `chatStreamDraftRetention.ts` 中 `normalizeMessageText` 使用 `extractResponseText`。

- [ ] **Step 4: 传入 candidateSourceIds 给 ChatMessageItem**

从 `NotebookWorkspacePage` 传入 notebook 全部 source ids（不仅是 selected）。

---

### Task 9: 移除 enhanced_retrieval

**Files:**
- Modify: `src/components/notebook-workspace/panel/chat/ChatInputBox.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/ChatPanel.tsx`
- Modify: `src/components/notebook-workspace/panel/chat/useChatConversation.ts`

- [ ] **Step 1: 删除 ChatInputBox 中增强检索 Toggle 及相关 props**

- [ ] **Step 2: 删除 ChatPanel / useChatConversation 中 enableEnhancedRetrieval 状态与传递**

---

### Task 10: 更新 Mock 与测试

**Files:**
- Modify: `src/test/mocks/fixtures/chat.ts`
- Modify: `src/test/mocks/handlers/chatHandlers.ts`
- Modify: `src/components/notebook-workspace/panel/chat/chatConversationCommon.test.ts`
- Modify: `src/api/chat.mock.test.ts`

- [ ] **Step 1: 更新 fixture**

```typescript
export const createChatMessageFixture = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  create_time: Date.now(),
  update_time: Date.now(),
  chat_id: 'chat-1',
  user_id: 'user-1',
  role: 'assistant',
  seq_no: 1,
  fragments: [{
    id: 1, type: 'RESPONSE',
    response: { status: 'FINISHED', content: { type: 'text', text: { content: 'Rust 所有权...' } } },
  }],
  citations: [],
  ...overrides,
})
```

- [ ] **Step 2: 更新 chatHandlers list 响应**

- [ ] **Step 3: 更新/删除旧 citation 测试，新增 reducer/mapper 测试已在 Task 2/3 完成**

- [ ] **Step 4: 全量测试**

Run: `cd gonotelm-web && npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: TypeScript 检查**

Run: `cd gonotelm-web && npx tsc --noEmit`
Expected: 无错误

---

## Self-Review Checklist

- [x] Spec 所有章节均有对应 Task
- [x] 无 TBD / TODO 占位
- [x] 类型名前后一致（ChatUiFragment, StreamTaskEvent, ChatMessage）
- [x] enhanced_retrieval 移除有专门 Task
- [x] 引用 `<sup>idx</sup>` 有 Markdown + resolver + click 三层覆盖
- [x] Fragment 完整展示有 ChatMessageFragments Task

## 验收标准

1. 流式 PHASE → THINK → RESPONSE 分段可见
2. 历史消息 fragments 正确渲染
3. `<sup>1</sup>` 点击可加载引用内容
4. `last_stream_id` 使用 `event.id` 重连正常
5. enhanced_retrieval 已移除
6. `npx vitest run` 全部通过
