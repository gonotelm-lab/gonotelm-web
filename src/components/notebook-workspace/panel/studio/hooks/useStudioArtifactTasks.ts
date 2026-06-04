import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  generateStudioArtifact,
  getStudioArtifactResult,
  getStudioArtifactStatus,
  listNotebookStudioArtifacts,
  loadStudioArtifactContentFromUrl,
} from '@/api/studio'
import { useAdaptivePollingLoop } from '@/components/notebook-workspace/hooks/useAdaptivePollingLoop'
import { ApiError } from '@/lib/http'
import type {
  StudioArtifactKind,
  StudioArtifactResult,
  StudioArtifactTaskStatus,
} from '@/types/api'
import {
  buildTaskFailedMessage,
  isStudioTaskCompleted,
  isStudioTaskFailed,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
} from '../artifactStatus'
import type { StudioArtifactItem, StudioToolActionId } from '../types'

const studioArtifactPollBaseIntervalMs = 1_000
const studioArtifactPollMaxIntervalMs = 10_000
const studioArtifactListPageSize = 50

const createLocalArtifactId = () =>
  `studio-local-${Date.now()}-${Math.random().toString(16).slice(2)}`

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

const inferArtifactActionId = (kind: StudioArtifactKind): StudioToolActionId => {
  if (String(kind).toLowerCase() === 'mindmap') {
    return 'generate-mindmap'
  }
  return 'generate-mindmap'
}

const inferArtifactTitle = (kind: StudioArtifactKind) => {
  if (String(kind).toLowerCase() === 'mindmap') {
    return 'Mind Map'
  }
  return 'Artifact'
}

const toHistoryArtifactItem = (
  artifact: StudioArtifactResult,
  index: number,
): StudioArtifactItem => {
  const itemStatus = toArtifactVisualStatus(artifact.status)
  return {
    id: artifact.task_id,
    taskId: artifact.task_id,
    kind: 'mindmap',
    actionId: 'generate-mindmap',
    title: 'Mind Map',
    status: artifact.status,
    sourceCount: 0,
    sourceIds: [],
    content: artifact.content ?? '',
    contentUrl: artifact.content_url ?? '',
    contentKind: artifact.content_kind ?? 'inline',
    error: itemStatus === 'failed' ? buildTaskFailedMessage(artifact.status) : '',
    createdAt: Date.now() - index,
  }
}

export interface StudioPreviewState {
  open: boolean
  targetId: string
  loading: boolean
  content: string
  error: string
}

interface UseStudioArtifactTasksParams {
  notebookId: string
}

interface SubmitStudioArtifactTaskParams {
  kind: StudioArtifactKind
  sourceIds: string[]
  title: string
  actionId: StudioToolActionId
}

interface RetryStudioArtifactTaskParams {
  item: StudioArtifactItem
  fallbackSourceIds: string[]
}

const defaultPreviewState: StudioPreviewState = {
  open: false,
  targetId: '',
  loading: false,
  content: '',
  error: '',
}

export function useStudioArtifactTasks({
  notebookId,
}: UseStudioArtifactTasksParams) {
  const [artifactItems, setArtifactItems] = useState<StudioArtifactItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [pendingActions, setPendingActions] = useState<
    Partial<Record<StudioToolActionId, boolean>>
  >({})
  const [previewState, setPreviewState] = useState<StudioPreviewState>(
    defaultPreviewState,
  )

  const activeNotebookIdRef = useRef(notebookId)
  const artifactItemsRef = useRef(artifactItems)
  const historyLoadSeqRef = useRef(0)

  const previewTarget = useMemo(
    () => artifactItems.find((item) => item.id === previewState.targetId) ?? null,
    [artifactItems, previewState.targetId],
  )

  useEffect(() => {
    activeNotebookIdRef.current = notebookId
  }, [notebookId])

  useEffect(() => {
    artifactItemsRef.current = artifactItems
  }, [artifactItems])

  const applyTaskResult = useCallback(
    async (taskId: string, notebookSnapshot: string) => {
      try {
        const result = await getStudioArtifactResult(taskId)
        if (activeNotebookIdRef.current !== notebookSnapshot) {
          return
        }

        const itemStatus = toArtifactVisualStatus(result.status)
        setArtifactItems((prev) =>
          prev.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  status: result.status,
                  error:
                    itemStatus === 'failed'
                      ? buildTaskFailedMessage(result.status)
                      : '',
                  content: result.content ?? '',
                  contentUrl: result.content_url ?? '',
                  contentKind: result.content_kind ?? 'inline',
                }
              : item,
          ),
        )
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
      (item) => item.taskId && shouldStudioTaskKeepPolling(item.status),
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

          if (isStudioTaskCompleted(statusResp.status)) {
            await applyTaskResult(item.taskId, notebookSnapshot)
            return
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
        const page = await listNotebookStudioArtifacts(notebookId, {
          limit: studioArtifactListPageSize,
          offset,
        })
        if (historyLoadSeqRef.current !== requestSeq) {
          return
        }
        merged = [...merged, ...page.artifacts]
        offset = merged.length
        if (!page.has_more || page.artifacts.length === 0) {
          break
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
    }: SubmitStudioArtifactTaskParams) => {
      if (!notebookId) {
        return
      }
      const localId = createLocalArtifactId()
      setPendingActions((prev) => ({ ...prev, [actionId]: true }))
      setArtifactItems((prev) => [
        {
          id: localId,
          taskId: '',
          kind,
          actionId,
          title,
          status: 'pending',
          sourceCount: sourceIds.length,
          sourceIds,
          content: '',
          contentUrl: '',
          contentKind: 'inline',
          error: '',
          createdAt: Date.now(),
        },
        ...prev,
      ])

      try {
        const response = await generateStudioArtifact({
          notebook_id: notebookId,
          kind,
          source_ids: sourceIds,
        })

        const taskId = response.task_id
        setArtifactItems((prev) =>
          prev.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  id: taskId,
                  taskId,
                  status: 'running',
                  error: '',
                }
              : item,
          ),
        )
      } catch (error) {
        setArtifactItems((prev) =>
          prev.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  status: 'failed',
                  error: buildStudioErrorMessage(
                    error,
                    '创建产物任务失败，请重试。',
                  ),
                }
              : item,
          ),
        )
      } finally {
        setPendingActions((prev) => ({ ...prev, [actionId]: false }))
      }
    },
    [notebookId],
  )

  const retryArtifact = useCallback(
    ({ item, fallbackSourceIds }: RetryStudioArtifactTaskParams) => {
      const sourceIds =
        item.sourceIds.length > 0 ? item.sourceIds : fallbackSourceIds
      if (!sourceIds.length) {
        setArtifactItems((prev) =>
          prev.map((target) =>
            target.id === item.id
              ? {
                  ...target,
                  error: '请先勾选至少一个已就绪来源后再重试。',
                }
              : target,
          ),
        )
        return
      }

      void submitArtifactTask({
        kind: item.kind,
        sourceIds,
        title: item.title || inferArtifactTitle(item.kind),
        actionId: item.actionId || inferArtifactActionId(item.kind),
      })
    },
    [submitArtifactTask],
  )

  const openArtifactPreview = useCallback(
    (item: StudioArtifactItem) => {
      const loadPreview = async () => {
        setPreviewState({
          open: true,
          targetId: item.id,
          loading: true,
          content: '',
          error: '',
        })
        try {
          let content = item.content
          let contentUrl = item.contentUrl
          let taskStatus: StudioArtifactTaskStatus = item.status
          let itemStatus = toArtifactVisualStatus(item.status)
          let contentKind = item.contentKind

          if (!content && !contentUrl && item.taskId) {
            const result = await getStudioArtifactResult(item.taskId)
            content = result.content ?? ''
            contentUrl = result.content_url ?? ''
            taskStatus = result.status
            itemStatus = toArtifactVisualStatus(result.status)
            contentKind = result.content_kind ?? 'inline'
            setArtifactItems((prev) =>
              prev.map((target) =>
                target.id === item.id
                  ? {
                      ...target,
                      status: taskStatus,
                      content,
                      contentUrl,
                      contentKind,
                      error:
                        itemStatus === 'failed'
                          ? buildTaskFailedMessage(taskStatus)
                          : '',
                    }
                  : target,
              ),
            )
          }

          if (shouldStudioTaskKeepPolling(taskStatus)) {
            setPreviewState((prev) => ({
              ...prev,
              loading: false,
              error: '任务尚未完成，请稍后再试。',
            }))
            return
          }

          if (itemStatus === 'failed') {
            setPreviewState((prev) => ({
              ...prev,
              loading: false,
              error: buildTaskFailedMessage(taskStatus),
            }))
            return
          }

          if (!content && contentUrl) {
            content = await loadStudioArtifactContentFromUrl(contentUrl)
            setArtifactItems((prev) =>
              prev.map((target) =>
                target.id === item.id
                  ? {
                      ...target,
                      content,
                    }
                  : target,
              ),
            )
          }

          setPreviewState((prev) => ({
            ...prev,
            loading: false,
            content,
            error: content ? '' : '当前产物没有可预览内容。',
          }))
        } catch (error) {
          setPreviewState((prev) => ({
            ...prev,
            loading: false,
            error: buildStudioErrorMessage(error, '加载预览内容失败，请重试。'),
          }))
        }
      }
      void loadPreview()
    },
    [],
  )

  const retryPreviewLoad = useCallback(() => {
    const target = artifactItems.find((item) => item.id === previewState.targetId)
    if (!target) {
      return
    }
    openArtifactPreview(target)
  }, [artifactItems, openArtifactPreview, previewState.targetId])

  const closePreviewOverlay = useCallback(() => {
    setPreviewState(defaultPreviewState)
  }, [])

  return {
    artifactItems,
    historyLoading,
    historyError,
    pendingActions,
    previewState,
    previewTarget,
    reloadHistoryArtifacts,
    submitArtifactTask,
    retryArtifact,
    openArtifactPreview,
    retryPreviewLoad,
    closePreviewOverlay,
  }
}
