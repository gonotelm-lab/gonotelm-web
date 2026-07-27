import { http } from 'msw'
import {
  createListNotebooksResponseFixture,
  createListNotebookSourcesResponseFixture,
  createNotebookFixture,
  createNotebookSourceFixture,
  createNotebookSummaryFixture,
} from '../fixtures/notebook'
import { getMockScenario } from '../scenarios'
import { createSuccessResponse, resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

const notebookSummaries = [
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
    const sortBy = new URL(request.url).searchParams.get('sort_by')
    const sortedNotebooks = [...notebookSummaries].sort((a, b) => {
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
    return resolveScenarioResponse({
      scenario,
      successData: null,
      emptyData: null,
    })
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
]
