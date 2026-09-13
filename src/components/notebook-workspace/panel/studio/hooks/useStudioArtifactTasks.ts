import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import i18n from '@/i18n'
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
  GenerateSlidesParameters,
  GenerateVideoOverviewParameters,
} from '@/types/api'
import {
  buildTaskFailedMessage,
  isStudioTaskCancelled,
  isStudioTaskCompleted,
  isStudioTaskRetryable,
  isStudioTaskRunning,
  isStudioTaskSoftFailed,
  shouldFinalizeStatusPollFailure,
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
import { buildSlidesRequestParams } from '../slidesSettings'
import { buildVideoOverviewRequestParams } from '../videoOverviewSettings'
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
  fallback = i18n.t('studio:error.requestFailed'),
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
  slides?: GenerateSlidesParameters,
  videoOverview?: GenerateVideoOverviewParameters,
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
    case 'slides':
      return {
        tip: slides?.tip,
        language: slides?.language,
        visual_style: slides?.visual_style,
      }
    case 'video_overview':
      return {
        tip: videoOverview?.tip,
        language: videoOverview?.language,
        visual_style: videoOverview?.visual_style,
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
  slides?: GenerateSlidesParameters
  videoOverview?: GenerateVideoOverviewParameters
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
  const statusPollFailureCountsRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    activeNotebookIdRef.current = notebookId
    statusPollFailureCountsRef.current.clear()
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
                    i18n.t('studio:error.fetchResult'),
                  ),
                }
              : item,
          ),
        )
      }
    },
    [],
  )

  const clearStatusPollFailure = useCallback((itemId: string) => {
    statusPollFailureCountsRef.current.delete(itemId)
  }, [])

  const bumpStatusPollFailure = useCallback((itemId: string) => {
    const next = (statusPollFailureCountsRef.current.get(itemId) ?? 0) + 1
    statusPollFailureCountsRef.current.set(itemId, next)
    return next
  }, [])

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
          if (activeNotebookIdRef.current !== notebookSnapshot) {
            return
          }
          const statusTimestampMs = normalizeStudioTimestampMs(statusResp.timestamp)

          if (isStudioTaskCompleted(statusResp.status)) {
            clearStatusPollFailure(item.id)
            return applyTaskResult(item.taskId, notebookSnapshot)
          }

          if (isStudioTaskCancelled(statusResp.status)) {
            clearStatusPollFailure(item.id)
            const failedMessage = buildTaskFailedMessage(statusResp.status)
            setArtifactItems((prev) => {
              let changed = false
              const next = prev.map((target) => {
                if (target.id !== item.id) {
                  return target
                }
                const nextCreatedAt = statusTimestampMs ?? target.createdAt
                if (
                  target.status === statusResp.status &&
                  target.error === failedMessage &&
                  target.createdAt === nextCreatedAt
                ) {
                  return target
                }
                changed = true
                return {
                  ...target,
                  status: statusResp.status,
                  error: failedMessage,
                  createdAt: nextCreatedAt,
                }
              })
              return changed ? next : prev
            })
            return
          }

          if (isStudioTaskSoftFailed(statusResp.status)) {
            const failureCount = bumpStatusPollFailure(item.id)
            if (!shouldFinalizeStatusPollFailure(failureCount)) {
              // Backend may still be retrying; keep prior pending/running status.
              return
            }
            clearStatusPollFailure(item.id)
            const failedMessage = buildTaskFailedMessage(statusResp.status)
            setArtifactItems((prev) => {
              let changed = false
              const next = prev.map((target) => {
                if (target.id !== item.id) {
                  return target
                }
                const nextCreatedAt = statusTimestampMs ?? target.createdAt
                if (
                  target.status === statusResp.status &&
                  target.error === failedMessage &&
                  target.createdAt === nextCreatedAt
                ) {
                  return target
                }
                changed = true
                return {
                  ...target,
                  status: statusResp.status,
                  error: failedMessage,
                  createdAt: nextCreatedAt,
                }
              })
              return changed ? next : prev
            })
            return
          }

          clearStatusPollFailure(item.id)
          setArtifactItems((prev) => {
            let changed = false
            const next = prev.map((target) => {
              if (target.id !== item.id) {
                return target
              }
              const nextCreatedAt = statusTimestampMs ?? target.createdAt
              if (
                target.status === statusResp.status &&
                !target.error &&
                target.createdAt === nextCreatedAt
              ) {
                return target
              }
              changed = true
              return {
                ...target,
                status: statusResp.status,
                error: '',
                createdAt: nextCreatedAt,
              }
            })
            return changed ? next : prev
          })
        } catch (error) {
          const failureCount = bumpStatusPollFailure(item.id)
          if (!shouldFinalizeStatusPollFailure(failureCount)) {
            return
          }
          clearStatusPollFailure(item.id)
          setArtifactItems((prev) =>
            prev.map((target) =>
              target.id === item.id
                ? {
                    ...target,
                    status: 'failed',
                    error: buildStudioErrorMessage(
                      error,
                      i18n.t('studio:error.pollStatus'),
                    ),
                  }
                : target,
            ),
          )
        }
      }),
    )
    return true
  }, [applyTaskResult, bumpStatusPollFailure, clearStatusPollFailure])

  const hasPendingArtifacts = useMemo(
    () =>
      artifactItems.some(
        (item) =>
          Boolean(item.taskId) && shouldStudioTaskKeepPolling(item.status),
      ),
    [artifactItems],
  )

  useAdaptivePollingLoop({
    // Wake when new in-flight artifacts appear; stay off while the list is idle.
    enabled: Boolean(notebookId) && hasPendingArtifacts,
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
      setHistoryError(buildStudioErrorMessage(error, i18n.t('studio:error.loadHistory')))
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
      slides,
      videoOverview,
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
        slides,
        videoOverview,
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
          ...(kind === 'slides'
            ? { slides: buildSlidesRequestParams(slides) }
            : {}),
          ...(kind === 'video_overview'
            ? { video_overview: buildVideoOverviewRequestParams(videoOverview) }
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
          message: buildStudioErrorMessage(error, i18n.t('studio:error.createTask')),
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
          message: buildStudioErrorMessage(error, i18n.t('studio:error.saveNote')),
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
        clearStatusPollFailure(item.id)
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
                  error: buildStudioErrorMessage(error, i18n.t('studio:error.retryTask')),
                }
              : target,
          ),
        )
      } finally {
        setArtifactActionPending(item.id, 'retry', false)
      }
    },
    [clearStatusPollFailure, setArtifactActionPending],
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
                  error: buildStudioErrorMessage(error, i18n.t('studio:error.cancelTask')),
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
                  error: buildStudioErrorMessage(error, i18n.t('studio:error.deleteArtifact')),
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
          message: buildStudioErrorMessage(error, i18n.t('studio:error.convertToSource')),
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
        message: i18n.t('studio:error.updateTitle'),
      })
      throw error
    }
  }, [])

  const patchArtifactContentUrl = useCallback((artifactId: string, contentUrl: string) => {
    const nextUrl = contentUrl.trim()
    if (!artifactId || !nextUrl) {
      return
    }
    setArtifactItems((prev) => {
      const current = prev.find((item) => item.id === artifactId)
      if (!current || current.contentUrl === nextUrl) {
        return prev
      }
      return prev.map((item) =>
        item.id === artifactId ? { ...item, contentUrl: nextUrl } : item,
      )
    })
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
    patchArtifactContentUrl,
    isArtifactActionPending,
  }
}
