import { http } from 'msw'
import {
  createGetNotebookSharingResponseFixture,
  createListNotebooksResponseFixture,
  createListNotebookSourcesResponseFixture,
  createNotebookAccessFixture,
  createNotebookFixture,
  createNotebookSourceFixture,
  createNotebookSummaryFixture,
  createUpsertNotebookMemberResponseFixture,
} from '../fixtures/notebook'
import { getMockScenario } from '../scenarios'
import { createSuccessResponse, resolveNoContentScenarioResponse, resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

const ownedNotebookSummaries = [
  createNotebookSummaryFixture({
    id: 'notebook-1',
    name: 'Rust 入门',
    source_count: 2,
    updated_at: Date.UTC(2025, 6, 17, 8),
  }),
  createNotebookSummaryFixture({
    id: 'notebook-2',
    name: 'Rust 并发',
    source_count: 1,
    desc: '并发原语与实践',
    updated_at: Date.UTC(2025, 6, 18, 9),
  }),
  createNotebookSummaryFixture({
    id: 'notebook-3',
    name: 'Rust 生命周期',
    source_count: 3,
    desc: '借用检查与生命周期',
    updated_at: Date.UTC(2025, 6, 16, 9),
  }),
]

const sharedNotebookSummaries = [
  createNotebookSummaryFixture({
    id: 'notebook-shared-1',
    name: '团队 Rust 指南',
    source_count: 4,
    desc: '团队共享的 Rust 实践',
    updated_at: Date.UTC(2025, 6, 20, 10),
    owner: {
      user_id: 'user-alice',
      nickname: 'Alice',
      avatar_url: '',
    },
  }),
  createNotebookSummaryFixture({
    id: 'notebook-shared-2',
    name: 'Async Patterns',
    source_count: 2,
    desc: '异步模式速查',
    updated_at: Date.UTC(2025, 6, 15, 10),
    owner: {
      user_id: 'user-bob',
      nickname: 'Bob',
      avatar_url: '',
    },
  }),
]

const notebookSources = [
  createNotebookSourceFixture({
    id: 'source-1',
    kind: 'text',
    status: 'ready',
    title: 'Ownership 速记',
  }),
  createNotebookSourceFixture({
    id: 'source-2',
    kind: 'url',
    status: 'ready',
    title: 'Rust Book',
    url: {
      url: 'https://doc.rust-lang.org/book/',
    },
  }),
]

export const notebookHandlers = [
  http.get(`${apiBaseUrl}/api/v1/notebooks`, async ({ request }) => {
    const scenario = getMockScenario('notebook')
    const requestUrl = new URL(request.url)
    const sortBy = requestUrl.searchParams.get('sort_by')
    const scope = requestUrl.searchParams.get('scope') ?? 'owned'
    const source = scope === 'shared' ? sharedNotebookSummaries : ownedNotebookSummaries
    const sortedNotebooks = [...source].sort((a, b) => {
      if (sortBy === 'last_active') {
        return b.updated_at - a.updated_at
      }
      return a.updated_at - b.updated_at
    })

    return resolveScenarioResponse({
      scenario,
      successData: createListNotebooksResponseFixture(sortedNotebooks),
      emptyData: createListNotebooksResponseFixture([]),
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/notebooks`, async ({ request }) => {
    const scenario = getMockScenario('notebook')
    const body = (await request.json()) as { name?: string }
    const normalizedName = body.name?.trim() ?? ''
    const createdId = normalizedName ? 'notebook-created-with-name' : 'notebook-created-later'
    return resolveScenarioResponse({
      scenario,
      successData: { id: createdId },
      emptyData: { id: '' },
    })
  }),

  http.delete(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveNoContentScenarioResponse({ scenario })
  }),

  http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async ({ params }) => {
    const scenario = getMockScenario('notebook')
    const notebookId = String(params.notebookId ?? 'notebook-1')
    return resolveScenarioResponse({
      scenario,
      successData: createNotebookFixture({
        id: notebookId,
      }),
      emptyData: createNotebookFixture({
        id: notebookId,
        name: '',
        desc: '',
        source_count: 0,
        updated_at: 0,
      }),
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/notebooks/:notebookId/chats`, async ({ params }) => {
    const scenario = getMockScenario('notebook')
    const notebookId = String(params.notebookId ?? 'notebook-1')
    return resolveScenarioResponse({
      scenario,
      successData: {
        chat_id: `chat-${notebookId}`,
      },
      emptyData: {
        chat_id: '',
      },
    })
  }),

  http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId/access`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveScenarioResponse({
      scenario,
      successData: createNotebookAccessFixture(),
      emptyData: createNotebookAccessFixture({
        role: 'viewer',
        can_manage_content: false,
        can_manage_notebook: false,
        can_manage_sharing: false,
      }),
    })
  }),

  http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId/sharing`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveScenarioResponse({
      scenario,
      successData: createGetNotebookSharingResponseFixture(),
      emptyData: createGetNotebookSharingResponseFixture({ members: [] }),
    })
  }),

  http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId/visibility`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveNoContentScenarioResponse({ scenario })
  }),

  http.put(`${apiBaseUrl}/api/v1/notebooks/:notebookId/sharing/members`, async ({ request }) => {
    const scenario = getMockScenario('notebook')
    const body = (await request.json()) as { email?: string; role?: 'collaborator' | 'viewer' }
    return resolveScenarioResponse({
      scenario,
      successData: createUpsertNotebookMemberResponseFixture({ role: body.role ?? 'viewer' }),
      emptyData: { user_id: '', role: 'viewer' },
    })
  }),

  http.delete(
    `${apiBaseUrl}/api/v1/notebooks/:notebookId/sharing/members/:userId`,
    async () => {
      const scenario = getMockScenario('notebook')
      return resolveNoContentScenarioResponse({ scenario })
    },
  ),

  http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId/sources`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveScenarioResponse({
      scenario,
      successData: createListNotebookSourcesResponseFixture(notebookSources),
      emptyData: createListNotebookSourcesResponseFixture([]),
    })
  }),

  http.patch(`${apiBaseUrl}/api/v1/notebooks/:notebookId`, async () =>
    createSuccessResponse(null),
  ),

  http.post(`${apiBaseUrl}/api/v1/notebooks/:notebookId/description/generation`, async ({ params }) => {
    const scenario = getMockScenario('notebook')
    const notebookId = String(params.notebookId ?? 'notebook-1')
    return resolveScenarioResponse({
      scenario,
      successData: {
        desc: `Generated description for ${notebookId}`,
      },
      emptyData: {
        desc: '',
      },
    })
  }),
]
