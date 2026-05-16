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
  }),
  createNotebookSummaryFixture({
    id: 'notebook-2',
    name: 'Rust 并发',
    source_count: 1,
    desc: '并发原语与实践',
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
  http.get(`${apiBaseUrl}/api/v1/notebook/list`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveScenarioResponse({
      scenario,
      successData: createListNotebooksResponseFixture(notebookSummaries),
      emptyData: createListNotebooksResponseFixture([]),
    })
  }),

  http.get(`${apiBaseUrl}/api/v1/notebook/:notebookId`, async ({ params }) => {
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
      }),
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/notebook/:notebookId/chat`, async ({ params }) => {
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

  http.get(`${apiBaseUrl}/api/v1/notebook/:notebookId/source/list`, async () => {
    const scenario = getMockScenario('notebook')
    return resolveScenarioResponse({
      scenario,
      successData: createListNotebookSourcesResponseFixture(notebookSources),
      emptyData: createListNotebookSourcesResponseFixture([]),
    })
  }),

  http.put(`${apiBaseUrl}/api/v1/notebook/:notebookId/name`, async () =>
    createSuccessResponse(null),
  ),
]
