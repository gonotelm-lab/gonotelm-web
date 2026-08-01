import { http } from 'msw'
import { getMockScenario } from '../scenarios'
import { createErrorResponse, resolveNoContentScenarioResponse, resolveScenarioResponse } from './httpResponse'

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
  if (kind === 'note') return '笔记'
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

  if (artifactKind === 'note') {
    return {
      notebook_id: notebookId,
      task_id: taskId,
      kind: artifactKind,
      status: 'completed',
      title,
      source_ids: sourceIds,
      timestamp,
      content: '## Mock Note\n\nSaved from assistant message.',
      content_kind: 'inline',
      extras: {
        chat_id: 'chat-1',
        msg_id: 'msg-1',
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
  http.post(`${apiBaseUrl}/api/v1/notebooks/:notebookId/artifacts`, async ({ params, request }) => {
    const scenario = getMockScenario('studio')
    const notebookId = String(params.notebookId ?? 'unknown')
    const requestBody = (await request.json().catch(() => ({}))) as {
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
      notebookId,
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
  http.get(`${apiBaseUrl}/api/v1/artifacts/:taskId/status`, async ({ params }) => {
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
  http.get(`${apiBaseUrl}/api/v1/artifacts/:taskId`, async ({ params }) => {
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
  http.post(`${apiBaseUrl}/api/v1/artifacts/:taskId/retry`, async ({ params }) => {
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
  http.post(`${apiBaseUrl}/api/v1/artifacts/:taskId/cancel`, async ({ params }) => {
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
  http.delete(`${apiBaseUrl}/api/v1/artifacts/:taskId`, async ({ params }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')
    studioTaskStore.delete(taskId)

    return resolveNoContentScenarioResponse({ scenario })
  }),
  http.patch(`${apiBaseUrl}/api/v1/artifacts/:taskId`, async ({ params, request }) => {
    const scenario = getMockScenario('studio')
    const taskId = String(params.taskId ?? '')
    const body = (await request.json().catch(() => ({}))) as {
      target?: string
      title?: string
    }
    if (body.target !== 'title') {
      return createErrorResponse(400, 'unsupported update target', 400_001)
    }
    const snapshot = studioTaskStore.get(taskId)
    if (!snapshot) {
      return createErrorResponse(404, 'artifact not found', 404_001)
    }
    studioTaskStore.set(taskId, {
      ...snapshot,
      title: String(body.title ?? '').trim(),
    })

    return resolveScenarioResponse({
      scenario,
      successData: null,
      emptyData: null,
    })
  }),
  http.get(`${apiBaseUrl}/api/v1/notebooks/:notebookId/artifacts`, async ({ params }) => {
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
