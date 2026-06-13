import { http } from 'msw'
import { getMockScenario } from '../scenarios'
import { resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'
let taskSeq = 1

interface StudioTaskSnapshot {
  notebookId: string
  kind: string
  sourceCount: number
  sourceIds: string[]
  title: string
  timestamp: number
  status: string
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

const buildArtifactTitle = (kind: string) => {
  if (kind === 'mindmap') return 'Mind Map'
  if (kind === 'report') return 'Report'
  if (kind === 'info_graphic') return '信息图'
  return 'Studio Artifact'
}

const buildArtifactResultPayload = (
  taskId: string,
  notebookId: string,
  artifactKind: string,
  sourceCount: number,
  sourceIds: string[],
  title: string,
  timestamp: number,
) => {
  if (artifactKind === 'info_graphic') {
    return {
      notebook_id: notebookId,
      task_id: taskId,
      kind: artifactKind,
      status: 'completed',
      title,
      source_ids: sourceIds,
      timestamp,
      content_url: 'https://example.com/mock-infographic.png',
      content_kind: 'storage',
      extras: {
        prompt: 'mock prompt',
        text_language: 'zh-cn(简体中文)',
        orientation: 'portrait',
      },
    }
  }

  return {
    notebook_id: notebookId,
    task_id: taskId,
    kind: artifactKind,
    status: 'completed',
    title,
    source_ids: sourceIds,
    timestamp,
    content: buildMindmapContent(taskId, notebookId, sourceCount),
    content_kind: 'inline',
  }
}

export const studioHandlers = [
  http.post(`${apiBaseUrl}/api/v1/studio/artifact/generate`, async ({ request }) => {
    const scenario = getMockScenario('studio')
    const requestBody = (await request.json().catch(() => ({}))) as {
      notebook_id?: string
      kind?: string
      source_ids?: string[]
      info_graphic?: {
        orientation?: string
        text_language?: string
        extra_prompt?: string
        detail_level?: string
      }
    }
    const sourceCount = Array.isArray(requestBody.source_ids)
      ? requestBody.source_ids.length
      : 0
    const sourceIds = Array.isArray(requestBody.source_ids) ? requestBody.source_ids : []
    const taskId = `task-${taskSeq}`
    taskSeq += 1
    studioTaskStore.set(taskId, {
      notebookId: requestBody.notebook_id ?? 'unknown',
      kind: requestBody.kind ?? 'mindmap',
      sourceCount,
      sourceIds,
      title: buildArtifactTitle(requestBody.kind ?? 'mindmap'),
      timestamp: Math.floor(Date.now() / 1_000),
      status: 'completed',
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
    const snapshot = studioTaskStore.get(taskId)

    return resolveScenarioResponse({
      scenario,
      successData: {
        task_id: taskId,
        status: snapshot?.status ?? 'completed',
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
    const artifactKind = snapshot?.kind ?? 'mindmap'
    const sourceCount = snapshot?.sourceCount ?? 0
    const sourceIds = snapshot?.sourceIds ?? []
    const title = snapshot?.title ?? 'Mind Map'
    const timestamp = snapshot?.timestamp ?? Math.floor(Date.now() / 1_000)

    return resolveScenarioResponse({
      scenario,
      successData: buildArtifactResultPayload(
        taskId,
        notebookId,
        artifactKind,
        sourceCount,
        sourceIds,
        title,
        timestamp,
      ),
      emptyData: {
        notebook_id: notebookId,
        task_id: taskId,
        kind: artifactKind,
        status: 'completed',
        title,
        source_ids: sourceIds,
        timestamp,
        content: '',
        content_kind: 'inline',
      },
    })
  }),
  http.post(`${apiBaseUrl}/api/v1/studio/artifact/:taskId/retry`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')
    const snapshot = studioTaskStore.get(taskId)
    if (snapshot) {
      studioTaskStore.set(taskId, {
        ...snapshot,
        status: 'running',
      })
    }

    return resolveScenarioResponse({
      scenario,
      successData: null,
      emptyData: null,
    })
  }),
  http.post(`${apiBaseUrl}/api/v1/studio/artifact/:taskId/cancel`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')
    const snapshot = studioTaskStore.get(taskId)
    if (snapshot) {
      studioTaskStore.set(taskId, {
        ...snapshot,
        status: 'cancelled',
      })
    }

    return resolveScenarioResponse({
      scenario,
      successData: null,
      emptyData: null,
    })
  }),
  http.post(`${apiBaseUrl}/api/v1/studio/artifact/:taskId/delete`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')
    studioTaskStore.delete(taskId)

    return resolveScenarioResponse({
      scenario,
      successData: null,
      emptyData: null,
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
            kind: 'mindmap',
            status: 'completed',
            title: 'Mind Map',
            source_ids: ['source-1', 'source-2'],
            timestamp: Math.floor(Date.now() / 1_000),
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
