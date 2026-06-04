import { http } from 'msw'
import { getMockScenario } from '../scenarios'
import { resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'
let taskSeq = 1

interface StudioTaskSnapshot {
  notebookId: string
  kind: string
  sourceCount: number
}

const studioTaskStore = new Map<string, StudioTaskSnapshot>()

const buildMindmapContent = (taskId: string, notebookId: string, sourceCount: number) =>
  [
    '```mermaid',
    'mindmap',
    `  root((Notebook ${notebookId || 'unknown'}))`,
    `    Task ${taskId}`,
    '    Studio 主题',
    `      来源数量 ${sourceCount}`,
    '```',
  ].join('\n')

export const studioHandlers = [
  http.post(`${apiBaseUrl}/api/v1/studio/artifact/generate`, async ({ request }) => {
    const scenario = getMockScenario('studio')
    const requestBody = (await request.json().catch(() => ({}))) as {
      notebook_id?: string
      kind?: string
      source_ids?: string[]
    }
    const sourceCount = Array.isArray(requestBody.source_ids)
      ? requestBody.source_ids.length
      : 0
    const taskId = `task-${taskSeq}`
    taskSeq += 1
    studioTaskStore.set(taskId, {
      notebookId: requestBody.notebook_id ?? 'unknown',
      kind: requestBody.kind ?? 'mindmap',
      sourceCount,
    })

    return resolveScenarioResponse({
      scenario,
      successData: {
        task_id: taskId,
      },
      emptyData: {
        task_id: '',
      },
    })
  }),
  http.get(`${apiBaseUrl}/api/v1/studio/artifact/:taskId/status`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')

    return resolveScenarioResponse({
      scenario,
      successData: {
        task_id: taskId,
        status: 'completed',
      },
      emptyData: {
        task_id: taskId,
        status: 'completed',
      },
    })
  }),
  http.get(`${apiBaseUrl}/api/v1/studio/artifact/:taskId/result`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')
    const snapshot = studioTaskStore.get(taskId)
    const notebookId = snapshot?.notebookId ?? 'notebook-1'
    const sourceCount = snapshot?.sourceCount ?? 0

    return resolveScenarioResponse({
      scenario,
      successData: {
        notebook_id: notebookId,
        task_id: taskId,
        status: 'completed',
        content: buildMindmapContent(taskId, notebookId, sourceCount),
        content_kind: 'inline',
      },
      emptyData: {
        notebook_id: notebookId,
        task_id: taskId,
        status: 'completed',
        content: '',
        content_kind: 'inline',
      },
    })
  }),
  http.get(`${apiBaseUrl}/api/v1/notebook/:notebookId/studio/artifact/list`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const notebookId = String(params.notebookId ?? 'notebook-1')
    const fallbackTaskId = `history-${notebookId}`

    return resolveScenarioResponse({
      scenario,
      successData: {
        artifacts: [
          {
            notebook_id: notebookId,
            task_id: fallbackTaskId,
            status: 'completed',
            content: buildMindmapContent(fallbackTaskId, notebookId, 2),
            content_kind: 'inline',
          },
        ],
        limit: 50,
        offset: 0,
        has_more: false,
      },
      emptyData: {
        artifacts: [],
        limit: 50,
        offset: 0,
        has_more: false,
      },
    })
  }),
]
