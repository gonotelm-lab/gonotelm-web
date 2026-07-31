import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelStudioArtifactTask,
  convertNoteToSource as convertNoteToSourceApi,
  deleteStudioArtifact,
  generateStudioArtifact,
  getStudioArtifact,
  getStudioArtifactStatus,
  listNotebookStudioArtifacts,
  retryStudioArtifactTask,
  updateStudioArtifact,
} from '@/api/studio'
import { useAdaptivePollingLoop } from '@/components/notebook-workspace/hooks/useAdaptivePollingLoop'
import { ApiError } from '@/lib/http'
import type {
  InfoGraphicArtifactExtras,
  StudioArtifactKind,
  StudioArtifactResult,
  GenerateMindmapParameters,
  GenerateReportParameters,
  GenerateInfoGraphicParameters,
  GenerateAudioOverviewParameters,
  GenerateFlashcardParameters,
  GenerateQuizParameters,
  GenerateDataTableParameters,
} from '@/types/api'
import {
  buildTaskFailedMessage,
  isStudioTaskCompleted,
  isStudioTaskFailed,
  isStudioTaskRetryable,
  isStudioTaskRunning,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
} from '../artifactStatus'
import type { SaveMessageAsNoteParams, StudioArtifactItem, StudioToolActionId } from '../types'
import { buildMindmapRequestParams } from '../mindmapSettings'
import { buildReportRequestParams } from '../reportSettings'
import { buildInfoGraphicRequestParams } from '../infoGraphicSettings'
import { buildAudioOverviewRequestParams } from '../audioOverviewSettings'
import { buildFlashcardRequestParams } from '../flashcardSettings'
import { buildQuizRequestParams } from '../quizSettings'
import { buildDataTableRequestParams } from '../datatableSettings'
import {
  resolveStudioArtifactActionId,
  resolveStudioArtifactFallbackTitle,
  resolveStudioArtifactKind,
} from '../resolveStudioArtifactKind'

const studioArtifactPollBaseIntervalMs = 1_000
const studioArtifactPollMaxIntervalMs = 10_000
const studioArtifactListPageSize = 50
const studioTimestampSecondUpperBound = 10_000_000_000
type StudioArtifactItemAction = 'retry' | 'cancel' | 'delete' | 'convert'

const buildArtifactActionKey = (
  itemId: string,
  action: StudioArtifactItemAction,
) => `${itemId}:${action}`

const buildStudioErrorMessage = (
  error: unknown,
  fallback = 'Studio 请求失败，请稍后重试。',
) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

const normalizeStudioTimestampMs = (timestamp: number | undefined) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null
  }
  return timestamp < studioTimestampSecondUpperBound ? timestamp * 1_000 : timestamp
}

const resolveInfoGraphicExtras = (
  kind: StudioArtifactKind,
  extras: StudioArtifactResult['extras'],
): InfoGraphicArtifactExtras | undefined => {
  if (kind !== 'info_graphic' || !extras) {
    return undefined
  }
  return extras as InfoGraphicArtifactExtras
}

const buildLocalExtras = (
  kind: StudioArtifactKind,
  report?: GenerateReportParameters,
  infoGraphic?: GenerateInfoGraphicParameters,
  audioOverview?: GenerateAudioOverviewParameters,
  flashcard?: GenerateFlashcardParameters,
  quiz?: GenerateQuizParameters,
  dataTable?: GenerateDataTableParameters,
): StudioArtifactItem['extras'] => {
  switch (kind) {
    case 'mindmap':
      return undefined
    case 'report':
      return {
        style: report?.style,
        language: report?.language,
        tip: report?.tip,
      }
    case 'info_graphic':
      return {
        prompt: infoGraphic?.extra_prompt,
        text_language: infoGraphic?.text_language,
        orientation: infoGraphic?.orientation,
        detail_level: infoGraphic?.detail_level,
        visual_style: infoGraphic?.visual_style,
      }
    case 'audio_overview':
      return {
        tip: audioOverview?.tip,
        language: audioOverview?.language,
        style: audioOverview?.style,
      }
    case 'flashcard':
      return {
        count: flashcard?.count,
        difficulty: flashcard?.difficulty,
        tip: flashcard?.tip,
      }
    case 'quiz':
      return {
        count: quiz?.count,
        difficulty: quiz?.difficulty,
        tip: quiz?.tip,
      }
    case 'data_table':
      return {
        tip: dataTable?.tip,
      }
    case 'note':
      return undefined
  }
  return undefined
}

const toHistoryArtifactItem = (
  artifact: StudioArtifactResult,
  index: number,
): StudioArtifactItem => {
  const itemStatus = toArtifactVisualStatus(artifact.status)
  const artifactKind = resolveStudioArtifactKind(artifact.kind)
  const sourceIds = Array.isArray(artifact.source_ids)
    ? artifact.source_ids.map((sourceId) => String(sourceId))
    : []
  const createdAt = normalizeStudioTimestampMs(artifact.timestamp) ?? Date.now() - index
  return {
    id: artifact.task_id,
    taskId: artifact.task_id,
    kind: artifactKind,
    actionId: resolveStudioArtifactActionId(artifactKind),
    title: String(artifact.title ?? '').trim(),
    status: artifact.status,
    sourceCount: sourceIds.length,
    sourceIds,
    content: artifact.content ?? '',
    contentUrl: artifact.content_url ?? '',
    contentKind: artifact.content_kind ?? 'inline',
    infoGraphicExtras: resolveInfoGraphicExtras(artifactKind, artifact.extras),
    extras: artifact.extras,
    error:
      itemStatus === 'failed' || itemStatus === 'cancelled'
        ? buildTaskFailedMessage(artifact.status)
        : '',
    createdAt,
  }
}

interface UseStudioArtifactTasksParams {
  notebookId: string
  onSourceCreated?: () => void
}

interface SubmitStudioArtifactTaskParams {
  kind: StudioArtifactKind
  sourceIds: string[]
  title: string
  actionId: StudioToolActionId
  mindmap?: GenerateMindmapParameters
  report?: GenerateReportParameters
  infoGraphic?: GenerateInfoGraphicParameters
  audioOverview?: GenerateAudioOverviewParameters
  flashcard?: GenerateFlashcardParameters
  quiz?: GenerateQuizParameters
  data_table?: GenerateDataTableParameters
}

export function useStudioArtifactTasks({
  notebookId,
  onSourceCreated,
}: UseStudioArtifactTasksParams) {
  const [artifactItems, setArtifactItems] = useState<StudioArtifactItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [actionErrorToast, setActionErrorToast] = useState<{
    key: number
    message: string
  } | null>(null)
  const [pendingActions, setPendingActions] = useState<
    Partial<Record<StudioToolActionId, boolean>>
  >({})
  const [pendingArtifactActions, setPendingArtifactActions] = useState<
    Record<string, boolean>
  >({})

  const activeNotebookIdRef = useRef(notebookId)
  const artifactItemsRef = useRef(artifactItems)
  const historyLoadSeqRef = useRef(0)
  const actionErrorToastKeyRef = useRef(0)
  const onSourceCreatedRef = useRef(onSourceCreated)

  useEffect(() => {
    activeNotebookIdRef.current = notebookId
  }, [notebookId])

  useEffect(() => {
    onSourceCreatedRef.current = onSourceCreated
  }, [onSourceCreated])

  useEffect(() => {
    artifactItemsRef.current = artifactItems
  }, [artifactItems])

  const setArtifactActionPending = useCallback(
    (itemId: string, action: StudioArtifactItemAction, pending: boolean) => {
      const actionKey = buildArtifactActionKey(itemId, action)
      setPendingArtifactActions((prev) => {
        if (pending) {
          return { ...prev, [actionKey]: true }
        }
        if (!prev[actionKey]) {
          return prev
        }
        const next = { ...prev }
        delete next[actionKey]
        return next
      })
    },
    [],
  )

  const applyTaskResult = useCallback(
    async (taskId: string, notebookSnapshot: string) => {
      try {
        if (activeNotebookIdRef.current !== notebookSnapshot) {
          return
        }
        const result = await getStudioArtifact(taskId)
        const sourceIdsFromResult = Array.isArray(result.source_ids)
          ? result.source_ids.map((sourceId) => String(sourceId))
          : null
        const resultTimestampMs = normalizeStudioTimestampMs(result.timestamp)
        const hasResultKind = typeof result.kind === 'string' && result.kind.trim().length > 0
        const resultKind = hasResultKind ? resolveStudioArtifactKind(result.kind) : null
        const resultTitle = String(result.title ?? '').trim()
        if (activeNotebookIdRef.current === notebookSnapshot) {
          const itemStatus = toArtifactVisualStatus(result.status)
          setArtifactItems((prev) =>
            prev.map((item) => {
              if (item.id !== taskId) {
                return item
              }
              const nextSourceIds = sourceIdsFromResult ?? item.sourceIds
              const nextKind = resultKind ?? item.kind
              return {
                ...item,
                kind: nextKind,
                actionId: resolveStudioArtifactActionId(nextKind),
                status: result.status,
                title: resultTitle,
                sourceIds: nextSourceIds,
                sourceCount: nextSourceIds.length,
                createdAt: resultTimestampMs ?? item.createdAt,
                error:
                  itemStatus === 'failed' || itemStatus === 'cancelled'
                    ? buildTaskFailedMessage(result.status)
                    : '',
                content: result.content ?? '',
                contentUrl: result.content_url ?? '',
                contentKind: result.content_kind ?? 'inline',
                infoGraphicExtras: resolveInfoGraphicExtras(nextKind, result.extras),
                extras: result.extras,
              }
            }),
          )
        }
      } catch (error) {
        if (activeNotebookIdRef.current !== notebookSnapshot) {
          return
        }
        setArtifactItems((prev) =>
          prev.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  status: 'failed',
                  error: buildStudioErrorMessage(
                    error,
                    '拉取任务结果失败，请重试。',
                  ),
                }
              : item,
          ),
        )
      }
    },
    [],
  )

  const pollArtifactTick = useCallback(async () => {
    const notebookSnapshot = activeNotebookIdRef.current
    const pendingItems = artifactItemsRef.current.filter(
      (item) =>
        Boolean(item.taskId) && shouldStudioTaskKeepPolling(item.status),
    )
    if (pendingItems.length === 0) {
      return false
    }

    await Promise.all(
      pendingItems.map(async (item) => {
        try {
          const statusResp = await getStudioArtifactStatus(item.taskId)
          if (activeNotebookIdRef.current === notebookSnapshot) {
            if (isStudioTaskCompleted(statusResp.status)) {
              return applyTaskResult(item.taskId, notebookSnapshot)
            }
            if (isStudioTaskFailed(statusResp.status)) {
              setArtifactItems((prev) =>
                prev.map((target) =>
                  target.id === item.id
                    ? {
                        ...target,
                        status: statusResp.status,
                        error: buildTaskFailedMessage(statusResp.status),
                      }
                    : target,
                ),
              )
              return
            }

            setArtifactItems((prev) =>
              prev.map((target) =>
                target.id === item.id
                  ? {
                      ...target,
                      status: statusResp.status,
                      error: '',
                    }
                  : target,
              ),
            )
          }
        } catch (error) {
          setArtifactItems((prev) =>
            prev.map((target) =>
              target.id === item.id
                ? {
                    ...target,
                    status: 'failed',
                    error: buildStudioErrorMessage(
                      error,
                      '轮询任务状态失败，请重试。',
                    ),
                  }
                : target,
            ),
          )
        }
      }),
    )
    return true
  }, [applyTaskResult])

  useAdaptivePollingLoop({
    enabled: Boolean(notebookId),
    restartKey: notebookId,
    baseIntervalMs: studioArtifactPollBaseIntervalMs,
    maxIntervalMs: studioArtifactPollMaxIntervalMs,
    tick: pollArtifactTick,
  })

  const reloadHistoryArtifacts = useCallback(async () => {
    setHistoryError('')
    if (!notebookId) {
      setArtifactItems([])
      setHistoryLoading(false)
      return
    }

    const requestSeq = historyLoadSeqRef.current + 1
    historyLoadSeqRef.current = requestSeq
    setHistoryLoading(true)

    try {
      let merged: StudioArtifactResult[] = []
      let offset = 0
      while (true) {
        if (historyLoadSeqRef.current !== requestSeq) {
          return
        }
        const page = await listNotebookStudioArtifacts(notebookId, {
          limit: studioArtifactListPageSize,
          offset,
        })
        if (historyLoadSeqRef.current === requestSeq) {
          merged = [...merged, ...page.artifacts]
          offset = merged.length
          if (!page.has_more || page.artifacts.length === 0) {
            break
          }
        }
      }

      if (historyLoadSeqRef.current !== requestSeq) {
        return
      }

      const normalized = merged.map((artifact, index) =>
        toHistoryArtifactItem(artifact, index),
      )
      setArtifactItems(normalized)
    } catch (error) {
      if (historyLoadSeqRef.current !== requestSeq) {
        return
      }
      setHistoryError(buildStudioErrorMessage(error, '加载产物列表失败，请重试。'))
      setArtifactItems([])
    } finally {
      if (historyLoadSeqRef.current === requestSeq) {
        setHistoryLoading(false)
      }
    }
  }, [notebookId])

  useEffect(() => {
    void reloadHistoryArtifacts()
  }, [reloadHistoryArtifacts])

  const submitArtifactTask = useCallback(
    async ({
      kind,
      sourceIds,
      title,
      actionId,
      mindmap,
      report,
      infoGraphic,
      audioOverview,
      flashcard,
      quiz,
      data_table: dataTable,
    }: SubmitStudioArtifactTaskParams) => {
      if (!notebookId) {
        return
      }
      const localExtras = buildLocalExtras(
        kind,
        report,
        infoGraphic,
        audioOverview,
        flashcard,
        quiz,
        dataTable,
      )
      setPendingActions((prev) => ({ ...prev, [actionId]: true }))

      try {
        const response = await generateStudioArtifact(notebookId, {
          kind,
          source_ids: sourceIds,
          ...(kind === 'mindmap'
            ? { mindmap: buildMindmapRequestParams(mindmap) }
            : {}),
          ...(kind === 'report'
            ? { report: buildReportRequestParams(report) }
            : {}),
          ...(kind === 'info_graphic'
            ? { info_graphic: buildInfoGraphicRequestParams(infoGraphic) }
            : {}),
          ...(kind === 'audio_overview'
            ? { audio_overview: buildAudioOverviewRequestParams(audioOverview) }
            : {}),
          ...(kind === 'flashcard'
            ? { flashcard: buildFlashcardRequestParams(flashcard) }
            : {}),
          ...(kind === 'quiz'
            ? { quiz: buildQuizRequestParams(quiz) }
            : {}),
          ...(kind === 'data_table'
            ? { data_table: buildDataTableRequestParams(dataTable) }
            : {}),
        })

        const taskId = response.task_id
        setArtifactItems((prev) => [
          {
            id: taskId,
            taskId,
            kind,
            actionId,
            title,
            status: 'running',
            sourceCount: sourceIds.length,
            sourceIds,
            content: '',
            contentUrl: '',
            contentKind: 'inline',
            extras: localExtras,
            error: '',
            createdAt: Date.now(),
          },
          ...prev,
        ])
      } catch (error) {
        actionErrorToastKeyRef.current += 1
        setActionErrorToast({
          key: actionErrorToastKeyRef.current,
          message: buildStudioErrorMessage(error, '创建产物任务失败，请重试。'),
        })
      } finally {
        setPendingActions((prev) => ({ ...prev, [actionId]: false }))
      }
    },
    [notebookId],
  )

  const saveMessageAsNote = useCallback(
    async ({ chatId, msgId }: SaveMessageAsNoteParams) => {
      if (!notebookId || !chatId || !msgId) {
        return
      }

      setPendingActions((prev) => ({ ...prev, 'save-as-note': true }))
      try {
        const response = await generateStudioArtifact(notebookId, {
          kind: 'note',
          source_ids: [],
          note: {
            chat_id: chatId,
            msg_id: msgId,
          },
        })

        const taskId = response.task_id
        setArtifactItems((prev) => [
          {
            id: taskId,
            taskId,
            kind: 'note',
            actionId: 'save-as-note',
            title: resolveStudioArtifactFallbackTitle('note'),
            status: 'running',
            sourceCount: 0,
            sourceIds: [],
            content: '',
            contentUrl: '',
            contentKind: 'inline',
            extras: {
              chat_id: chatId,
              msg_id: msgId,
            },
            error: '',
            createdAt: Date.now(),
          },
          ...prev,
        ])
      } catch (error) {
        actionErrorToastKeyRef.current += 1
        setActionErrorToast({
          key: actionErrorToastKeyRef.current,
          message: buildStudioErrorMessage(error, '保存笔记失败，请重试。'),
        })
      } finally {
        setPendingActions((prev) => ({ ...prev, 'save-as-note': false }))
      }
    },
    [notebookId],
  )

  const clearActionErrorToast = useCallback(() => {
    setActionErrorToast(null)
  }, [])

  const retryArtifact = useCallback(
    async (item: StudioArtifactItem) => {
      if (!item.taskId || !isStudioTaskRetryable(item.status)) {
        return
      }
      setArtifactActionPending(item.id, 'retry', true)
      try {
        await retryStudioArtifactTask(item.taskId)
        setArtifactItems((prev) =>
          prev.map((target) =>
            target.id === item.id
              ? {
                  ...target,
                  status: 'running',
                  error: '',
                  content: '',
                  contentUrl: '',
                }
              : target,
          ),
        )
      } catch (error) {
        setArtifactItems((prev) =>
          prev.map((target) =>
            target.id === item.id
              ? {
                  ...target,
                  error: buildStudioErrorMessage(error, '重试任务失败，请稍后重试。'),
                }
              : target,
          ),
        )
      } finally {
        setArtifactActionPending(item.id, 'retry', false)
      }
    },
    [setArtifactActionPending],
  )

  const cancelArtifact = useCallback(
    async (item: StudioArtifactItem) => {
      if (!item.taskId || !isStudioTaskRunning(item.status)) {
        return
      }
      setArtifactActionPending(item.id, 'cancel', true)
      try {
        await cancelStudioArtifactTask(item.taskId)
        setArtifactItems((prev) =>
          prev.map((target) =>
            target.id === item.id
              ? {
                  ...target,
                  status: 'cancelled',
                  error: buildTaskFailedMessage('cancelled'),
                }
              : target,
          ),
        )
      } catch (error) {
        setArtifactItems((prev) =>
          prev.map((target) =>
            target.id === item.id
              ? {
                  ...target,
                  error: buildStudioErrorMessage(error, '取消任务失败，请稍后重试。'),
                }
              : target,
          ),
        )
      } finally {
        setArtifactActionPending(item.id, 'cancel', false)
      }
    },
    [setArtifactActionPending],
  )

  const deleteArtifact = useCallback(
    async (item: StudioArtifactItem) => {
      if (isStudioTaskRunning(item.status)) {
        return
      }
      if (!item.taskId) {
        setArtifactItems((prev) => prev.filter((target) => target.id !== item.id))
        return
      }
      setArtifactActionPending(item.id, 'delete', true)
      try {
        await deleteStudioArtifact(item.taskId)
        setArtifactItems((prev) => prev.filter((target) => target.id !== item.id))
      } catch (error) {
        setArtifactItems((prev) =>
          prev.map((target) =>
            target.id === item.id
              ? {
                  ...target,
                  error: buildStudioErrorMessage(error, '删除产物失败，请稍后重试。'),
                }
              : target,
          ),
        )
      } finally {
        setArtifactActionPending(item.id, 'delete', false)
      }
    },
    [setArtifactActionPending],
  )

  const convertNoteToSource = useCallback(
    async (item: StudioArtifactItem) => {
      if (!item.taskId || !isStudioTaskCompleted(item.status)) {
        return
      }
      setArtifactActionPending(item.id, 'convert', true)
      try {
        await convertNoteToSourceApi(item.taskId)
        onSourceCreatedRef.current?.()
      } catch (error) {
        actionErrorToastKeyRef.current += 1
        setActionErrorToast({
          key: actionErrorToastKeyRef.current,
          message: buildStudioErrorMessage(error, '转换为来源失败，请稍后重试。'),
        })
      } finally {
        setArtifactActionPending(item.id, 'convert', false)
      }
    },
    [setArtifactActionPending],
  )

  const renameArtifactTitle = useCallback(async (taskId: string, title: string) => {
    const normalized = title.trim()
    const current = artifactItemsRef.current.find((item) => item.id === taskId)
    if (!current) {
      return
    }
    if (current.status !== 'completed') {
      return
    }
    const prevTitle = current.title
    if (prevTitle === normalized) {
      return
    }

    setArtifactItems((prev) =>
      prev.map((item) => (item.id === taskId ? { ...item, title: normalized } : item)),
    )
    try {
      await updateStudioArtifact(taskId, { target: 'title', title: normalized })
    } catch (error) {
      setArtifactItems((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, title: prevTitle } : item)),
      )
      actionErrorToastKeyRef.current += 1
      setActionErrorToast({
        key: actionErrorToastKeyRef.current,
        message: '更新标题失败，请重试',
      })
      throw error
    }
  }, [])

  const isArtifactActionPending = useCallback(
    (itemId: string, action: StudioArtifactItemAction) =>
      Boolean(pendingArtifactActions[buildArtifactActionKey(itemId, action)]),
    [pendingArtifactActions],
  )

  return {
    artifactItems,
    historyLoading,
    historyError,
    actionErrorToast,
    clearActionErrorToast,
    pendingActions,
    reloadHistoryArtifacts,
    submitArtifactTask,
    saveMessageAsNote,
    retryArtifact,
    cancelArtifact,
    deleteArtifact,
    convertNoteToSource,
    renameArtifactTitle,
    isArtifactActionPending,
  }
}
