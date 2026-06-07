import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box } from '@mui/material'
import {
  createSource,
  deleteSource,
  retrySourcePreparation,
  updateSourceTitle,
  uploadFileSource,
  uploadToObjectStorage,
} from '../api/source'
import {
  deleteNotebook,
  getNotebook,
  getOrCreateNotebookChat,
  listNotebookSources,
  updateNotebookName,
} from '../api/notebook'
import { fileMd5 } from '../lib/md5'
import { resolveUploadMimeType } from '../lib/sourceMime'
import { useSourcePolling } from '../components/notebook-workspace/hooks/useSourcePolling'
import { type SourceCard, useWorkspaceStore } from '../store/workspace'
import type { Notebook, SourceKind, SourceStatus } from '../types/api'
import {
  ChatPanel,
  SourceSelectionController,
  SourcesPanel,
  StudioPanel,
  WorkspaceHeader,
  type SourceListItem,
} from '../components/notebook-workspace'
import type { ChatCitationJumpRequest } from '../components/notebook-workspace/panel/chat/types'

const processingStatusSet = new Set<SourceStatus>(['uploading', 'preparing'])
const notebookSourcesPageLimit = 50
const sourceRemoveAnimationMs = 300
const textSourceTitleMaxChars = 20
const workspacePanelDefaultWidthPx = 320
const workspacePanelMinWidthPx = 220
const workspacePanelAutoCollapseWidthPx = 170
const workspacePanelMaxWidthRatio = 0.5
const workspaceCenterMinWidthPx = 420
const workspaceResizeHandleWidthPx = 10
const workspacePanelTransitionMs = 220
const workspacePanelFadeTransitionMs = 160
const workspacePanelTransitionCurve = 'cubic-bezier(0.2, 0, 0, 1)'
const workspacePanelGridTransition = `grid-template-columns ${workspacePanelTransitionMs}ms ${workspacePanelTransitionCurve}`
const workspacePanelWidthTransition = `width ${workspacePanelTransitionMs}ms ${workspacePanelTransitionCurve}`
const workspacePanelContentTransition = `transform ${workspacePanelTransitionMs}ms ${workspacePanelTransitionCurve}, opacity ${workspacePanelFadeTransitionMs}ms ease`
const workspaceSourcesColumnVar = '--workspace-sources-column'
const workspaceInsightsColumnVar = '--workspace-insights-column'
const workspaceLeftHandleColumnVar = '--workspace-left-handle-column'
const workspaceRightHandleColumnVar = '--workspace-right-handle-column'

const isProcessingStatus = (status?: SourceStatus) =>
  !!status && processingStatusSet.has(status)

const detectSourceIconType = (
  kind: SourceKind,
  fileFormat?: string,
) => {
  if (kind === 'text') return 'text'
  if (kind === 'url') return 'url'

  const normalizedFormat = fileFormat?.trim().toLowerCase() ?? ''
  if (normalizedFormat === 'application/pdf') return 'pdf'
  if (normalizedFormat === 'application/epub+zip') return 'epub'
  if (normalizedFormat.startsWith('text/plain')) return 'txt'
  if (normalizedFormat.startsWith('text/markdown')) return 'markdown'
  return 'docx'
}

const truncateUTF8 = (text: string, maxChars: number) => {
  const chars = Array.from(text)
  if (chars.length <= maxChars) {
    return text
  }
  return chars.slice(0, maxChars).join('')
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const applyWorkspacePanelGridColumns = (
  container: HTMLDivElement,
  {
    sourcesCollapsed,
    insightsCollapsed,
    sourcesWidth,
    insightsWidth,
  }: {
    sourcesCollapsed: boolean
    insightsCollapsed: boolean
    sourcesWidth: number
    insightsWidth: number
  },
) => {
  container.style.setProperty(
    workspaceSourcesColumnVar,
    sourcesCollapsed ? '0px' : `${sourcesWidth}px`,
  )
  container.style.setProperty(
    workspaceInsightsColumnVar,
    insightsCollapsed ? '0px' : `${insightsWidth}px`,
  )
  container.style.setProperty(
    workspaceLeftHandleColumnVar,
    sourcesCollapsed ? '0px' : `${workspaceResizeHandleWidthPx}px`,
  )
  container.style.setProperty(
    workspaceRightHandleColumnVar,
    insightsCollapsed ? '0px' : `${workspaceResizeHandleWidthPx}px`,
  )
}

export function NotebookWorkspacePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSourcesPanelCollapsed, setIsSourcesPanelCollapsed] = useState(false)
  const [isInsightsPanelCollapsed, setIsInsightsPanelCollapsed] = useState(false)
  const [sourcesPanelWidthPx, setSourcesPanelWidthPx] = useState(workspacePanelDefaultWidthPx)
  const [insightsPanelWidthPx, setInsightsPanelWidthPx] = useState(workspacePanelDefaultWidthPx)
  const [workspaceContainerWidthPx, setWorkspaceContainerWidthPx] = useState(0)
  const [activeResizeSide, setActiveResizeSide] = useState<'left' | 'right' | null>(null)
  const [selectedSourceIds, setSelectedSourceIds] = useState<Record<string, boolean>>({})
  const [removingSourceIds, setRemovingSourceIds] = useState<Record<string, boolean>>({})
  const [isHydratingSources, setIsHydratingSources] = useState(false)
  const [notebookNameDraft, setNotebookNameDraft] = useState('')
  const [isNotebookNameEditing, setIsNotebookNameEditing] = useState(false)
  const [citationPreviewRequest, setCitationPreviewRequest] = useState<
    (ChatCitationJumpRequest & { requestId: number }) | null
  >(null)

  const sources = useWorkspaceStore((s) => s.sources)
  const addSource = useWorkspaceStore((s) => s.addSource)
  const patchSource = useWorkspaceStore((s) => s.patchSource)
  const removeSource = useWorkspaceStore((s) => s.removeSource)
  const setSources = useWorkspaceStore((s) => s.setSources)
  const setSourceStatus = useWorkspaceStore((s) => s.setSourceStatus)
  const notebookMeta = useWorkspaceStore((s) => s.notebookMeta)
  const patchNotebookMeta = useWorkspaceStore((s) => s.patchNotebookMeta)
  const resetWorkspace = useWorkspaceStore((s) => s.reset)
  const removeSourceTimersRef = useRef<number[]>([])
  const workspacePanelsRef = useRef<HTMLDivElement | null>(null)
  const sourcesPanelWidthRef = useRef(sourcesPanelWidthPx)
  const insightsPanelWidthRef = useRef(insightsPanelWidthPx)
  const sourcesPanelCollapsedRef = useRef(isSourcesPanelCollapsed)
  const insightsPanelCollapsedRef = useRef(isInsightsPanelCollapsed)
  const stopPanelResizeRef = useRef<(() => void) | null>(null)
  const citationPreviewRequestSeqRef = useRef(0)

  const resetWorkspaceUiState = useCallback(() => {
    setRemovingSourceIds({})
    setIsHydratingSources(true)
  }, [])

  const beginHydratingSources = useCallback(() => {
    setIsHydratingSources(true)
  }, [])

  const applyPanelSizingState = useCallback(
    ({
      nextSourcesCollapsed,
      nextInsightsCollapsed,
      nextSourcesWidth,
      nextInsightsWidth,
    }: {
      nextSourcesCollapsed: boolean
      nextInsightsCollapsed: boolean
      nextSourcesWidth: number
      nextInsightsWidth: number
    }) => {
      if (nextSourcesCollapsed !== isSourcesPanelCollapsed) {
        setIsSourcesPanelCollapsed(nextSourcesCollapsed)
      }
      if (nextInsightsCollapsed !== isInsightsPanelCollapsed) {
        setIsInsightsPanelCollapsed(nextInsightsCollapsed)
      }
      if (!nextSourcesCollapsed && nextSourcesWidth !== sourcesPanelWidthPx) {
        setSourcesPanelWidthPx(nextSourcesWidth)
      }
      if (!nextInsightsCollapsed && nextInsightsWidth !== insightsPanelWidthPx) {
        setInsightsPanelWidthPx(nextInsightsWidth)
      }
    },
    [
      insightsPanelWidthPx,
      isInsightsPanelCollapsed,
      isSourcesPanelCollapsed,
      sourcesPanelWidthPx,
    ],
  )

  useEffect(() => {
    resetWorkspace()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetWorkspaceUiState()
  }, [id, resetWorkspace, resetWorkspaceUiState])

  useEffect(() => {
    return () => {
      removeSourceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      removeSourceTimersRef.current = []
      stopPanelResizeRef.current?.()
      stopPanelResizeRef.current = null
    }
  }, [])

  useEffect(() => {
    sourcesPanelWidthRef.current = sourcesPanelWidthPx
  }, [sourcesPanelWidthPx])

  useEffect(() => {
    insightsPanelWidthRef.current = insightsPanelWidthPx
  }, [insightsPanelWidthPx])

  useEffect(() => {
    sourcesPanelCollapsedRef.current = isSourcesPanelCollapsed
  }, [isSourcesPanelCollapsed])

  useEffect(() => {
    insightsPanelCollapsedRef.current = isInsightsPanelCollapsed
  }, [isInsightsPanelCollapsed])

  useEffect(() => {
    const container = workspacePanelsRef.current
    if (!container) return
    applyWorkspacePanelGridColumns(container, {
      sourcesCollapsed: isSourcesPanelCollapsed,
      insightsCollapsed: isInsightsPanelCollapsed,
      sourcesWidth: Math.round(sourcesPanelWidthPx),
      insightsWidth: Math.round(insightsPanelWidthPx),
    })
  }, [
    insightsPanelWidthPx,
    isInsightsPanelCollapsed,
    isSourcesPanelCollapsed,
    sourcesPanelWidthPx,
  ])

  const handleSourceReady = useCallback(() => {
    if (!id) return
    // source 进入 ready 后，notebook 可能自动更新（如 source_count/描述），这里主动刷新一次。
    void queryClient.invalidateQueries({
      queryKey: ['notebook', id],
      exact: true,
    })
  }, [id, queryClient])

  useEffect(() => {
    const container = workspacePanelsRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0)
      setWorkspaceContainerWidthPx((prev) => (prev === nextWidth ? prev : nextWidth))
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useSourcePolling({
    notebookId: id,
    sources,
    removingSourceIds,
    setSourceStatus,
    onSourceReady: handleSourceReady,
  })

  const notebookQuery = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
    enabled: !!id,
  })
  const notebookChatQuery = useQuery({
    queryKey: ['notebook-chat', id],
    queryFn: () => getOrCreateNotebookChat(id),
    enabled: Boolean(id),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    const notebook = notebookQuery.data
    if (!notebook) return

    patchNotebookMeta({
      id: notebook.id,
      desc: notebook.desc ?? '',
      sourceCount: notebook.source_count,
      ...(isNotebookNameEditing ? {} : { name: notebook.name ?? '' }),
    })
  }, [isNotebookNameEditing, notebookQuery.data, patchNotebookMeta])

  useEffect(() => {
    const notebook = notebookQuery.data
    if (!id || !notebook) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    beginHydratingSources()
    const hydrateNotebookSources = async () => {
      if (notebook.source_count <= 0) {
        setSources([])
        return
      }

      let merged: SourceCard[] = []
      let offset = 0
      while (offset < notebook.source_count) {
        const page = await listNotebookSources(id, {
          limit: notebookSourcesPageLimit,
          offset,
        })
        if (cancelled) return
        if (page.sources.length === 0) break

        merged = [
          ...merged,
          ...page.sources.map((source) => ({
            id: source.id,
            kind: source.kind,
            status: source.status,
            title: source.title,
            textContent: source.text?.text,
            urlContent: source.url?.url,
            fileFormat: source.file?.format,
            fileUrl: source.file?.url,
            parsedContentUrl: source.parsed_content?.url,
          })),
        ]
        offset = merged.length
        if (!page.has_more) break
      }

      if (!cancelled) {
        setSources(merged)
      }
    }

    void hydrateNotebookSources().catch((error) => {
      console.warn('hydrate notebook sources failed', error)
    }).finally(() => {
      if (!cancelled) {
        setIsHydratingSources(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [beginHydratingSources, id, notebookQuery.data, setSources])

  const createSourceMutation = useMutation({
    mutationFn: createSource,
  })
  const uploadSourceMutation = useMutation({
    mutationFn: ({ sourceId, payload }: { sourceId: string; payload: Parameters<typeof uploadFileSource>[1] }) =>
      uploadFileSource(sourceId, payload),
  })
  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),
  })
  const retrySourceMutation = useMutation({
    mutationFn: (sourceId: string) => retrySourcePreparation(sourceId),
  })
  const updateSourceTitleMutation = useMutation({
    mutationFn: ({ sourceId, title }: { sourceId: string; title: string }) =>
      updateSourceTitle(sourceId, { title }),
  })
  const updateNotebookNameMutation = useMutation({
    mutationFn: ({ notebookId, name }: { notebookId: string; name: string }) =>
      updateNotebookName(notebookId, { name }),
  })
  const deleteNotebookMutation = useMutation({
    mutationFn: (notebookId: string) => deleteNotebook(notebookId),
  })

  const isBusy = useMemo(
    () =>
      createSourceMutation.isPending ||
      uploadSourceMutation.isPending ||
      deleteSourceMutation.isPending ||
      retrySourceMutation.isPending,
    [
      createSourceMutation.isPending,
      uploadSourceMutation.isPending,
      deleteSourceMutation.isPending,
      retrySourceMutation.isPending,
    ],
  )

  const sourceListItems = useMemo<SourceListItem[]>(() => {
    return sources.map((source) => ({
      id: source.id,
      kind: source.kind,
      title: source.title ?? '',
      name: source.title?.trim() ? source.title : source.id,
      iconType: detectSourceIconType(source.kind, source.fileFormat),
      status: source.status,
      textContent: source.textContent,
      urlContent: source.urlContent,
      fileFormat: source.fileFormat,
      fileUrl: source.fileUrl,
      parsedContentUrl: source.parsedContentUrl,
    }))
  }, [sources])

  const selectableSourceItems = useMemo(
    () =>
      sourceListItems.filter((item) => !isProcessingStatus(item.status)),
    [sourceListItems],
  )

  const allSourcesChecked =
    selectableSourceItems.length > 0 &&
    selectableSourceItems.every((item) => Boolean(selectedSourceIds[item.id]))

  const someSourcesChecked =
    !allSourcesChecked &&
    selectableSourceItems.some((item) => Boolean(selectedSourceIds[item.id]))

  const selectedSourceIdList = useMemo(
    () =>
      Object.keys(selectedSourceIds).filter((sourceId) => Boolean(selectedSourceIds[sourceId])),
    [selectedSourceIds],
  )
  const readySourceIdList = useMemo(
    () =>
      sourceListItems
        .filter((item) => item.status === 'ready')
        .map((item) => item.id),
    [sourceListItems],
  )

  const toggleAllSourceChecked = (checked: boolean) => {
    const next: Record<string, boolean> = {}
    selectableSourceItems.forEach((item) => {
      next[item.id] = checked
    })
    setSelectedSourceIds(next)
  }

  const toggleSourceItemChecked = (id: string, checked: boolean) => {
    setSelectedSourceIds((prev) => ({
      ...prev,
      [id]: checked,
    }))
  }

  const handleCreateSimpleSource = async (
    kind: Extract<SourceKind, 'text' | 'url'>,
    content: string,
  ) => {
    if (!id) return
    const normalized = content.trim()
    if (!normalized) return

    try {
      const created = await createSourceMutation.mutateAsync({
        notebook_id: id,
        kind,
        text: kind === 'text' ? normalized : undefined,
        url: kind === 'url' ? normalized : undefined,
      })
      addSource({
        id: created.id,
        kind,
        status: 'preparing',
        title: kind === 'text' ? truncateUTF8(normalized, textSourceTitleMaxChars) : normalized,
        textContent: kind === 'text' ? normalized : undefined,
        urlContent: kind === 'url' ? normalized : undefined,
      })
    } catch (err) {
      console.warn('create source failed', err)
      throw err
    }
  }

  const handleCreateFileSource = async (file: File) => {
    if (!id) return
    let createdSourceId = ''
    try {
      const created = await createSourceMutation.mutateAsync({
        notebook_id: id,
        kind: 'file',
      })
      createdSourceId = created.id
      const uploadMimeType = resolveUploadMimeType(file)
      addSource({
        id: created.id,
        kind: 'file',
        status: 'uploading',
        title: file.name,
        fileFormat: uploadMimeType,
      })

      const md5 = await fileMd5(file)
      const uploadConfig = await uploadSourceMutation.mutateAsync({
        sourceId: created.id,
        payload: {
          mime_type: uploadMimeType,
          filename: file.name,
          size: file.size,
          md5,
        },
      })

      await uploadToObjectStorage(file, uploadConfig)
      setSourceStatus(created.id, 'preparing')
    } catch (err) {
      if (createdSourceId) {
        setSourceStatus(createdSourceId, 'failed')
      }
      console.warn('create file source failed', err)
    }
  }

  const handleCreateFileSources = async (files: File[]) => {
    await Promise.all(
      files.map(async (file) => {
        await handleCreateFileSource(file)
      }),
    )
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!sourceId) return
    if (removingSourceIds[sourceId]) return

    try {
      await deleteSourceMutation.mutateAsync(sourceId)
      setRemovingSourceIds((prev) => ({
        ...prev,
        [sourceId]: true,
      }))
      const timerId = window.setTimeout(() => {
        removeSource(sourceId)
        setSelectedSourceIds((prev) => {
          if (!prev[sourceId]) return prev
          const next = { ...prev }
          delete next[sourceId]
          return next
        })
        setRemovingSourceIds((prev) => {
          if (!prev[sourceId]) return prev
          const next = { ...prev }
          delete next[sourceId]
          return next
        })
        removeSourceTimersRef.current = removeSourceTimersRef.current.filter(
          (activeTimerId) => activeTimerId !== timerId,
        )
      }, sourceRemoveAnimationMs)
      removeSourceTimersRef.current.push(timerId)
    } catch (err) {
      console.warn('delete source failed', sourceId, err)
    }
  }

  const handleRetrySource = async (sourceId: string) => {
    if (!sourceId) return
    if (removingSourceIds[sourceId]) return

    const targetSource = sources.find((source) => source.id === sourceId)
    if (!targetSource || targetSource.status !== 'failed') {
      return
    }

    try {
      await retrySourceMutation.mutateAsync(sourceId)
      // move failed source back to polling pipeline.
      setSourceStatus(sourceId, 'preparing')
    } catch (err) {
      console.warn('retry source preparation failed', sourceId, err)
    }
  }

  const handleRenameSourceTitle = async (sourceId: string, nextTitle: string) => {
    const normalizedTitle = nextTitle.trim()
    if (!normalizedTitle) {
      return
    }

    const source = sources.find((item) => item.id === sourceId)
    if (!source) {
      return
    }

    const prevTitle = source.title ?? ''
    if (prevTitle === normalizedTitle) {
      return
    }

    patchSource(sourceId, { title: normalizedTitle })
    try {
      await updateSourceTitleMutation.mutateAsync({
        sourceId,
        title: normalizedTitle,
      })
    } catch (error) {
      patchSource(sourceId, { title: prevTitle })
      console.warn('update source title failed', sourceId, error)
      throw error
    }
  }

  const handleNotebookNameChange = (value: string) => {
    setNotebookNameDraft(value)
    patchNotebookMeta({ name: value })
  }

  const handleNotebookNameFocus = () => {
    const currentName = notebookQuery.data?.name ?? notebookMeta.name
    setNotebookNameDraft(currentName)
    patchNotebookMeta({ name: currentName })
    setIsNotebookNameEditing(true)
  }

  const handleNotebookNameBlur = async () => {
    if (!id) {
      setIsNotebookNameEditing(false)
      return
    }

    const currentName = notebookQuery.data?.name ?? notebookMeta.name
    const nextName = notebookNameDraft.trim()
    if (!nextName || nextName === currentName) {
      setNotebookNameDraft(currentName)
      patchNotebookMeta({ name: currentName })
      setIsNotebookNameEditing(false)
      return
    }

    setIsNotebookNameEditing(false)
    queryClient.setQueryData<Notebook>(['notebook', id], (prev) => {
      if (!prev) return prev
      return {
        ...prev,
        name: nextName,
      }
    })
    patchNotebookMeta({ name: nextName })

    try {
      await updateNotebookNameMutation.mutateAsync({
        notebookId: id,
        name: nextName,
      })
      setNotebookNameDraft(nextName)
    } catch (error) {
      queryClient.setQueryData<Notebook>(['notebook', id], (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          name: currentName,
        }
      })
      setNotebookNameDraft(currentName)
      patchNotebookMeta({ name: currentName })
      console.warn('update notebook name failed', error)
    }
  }

  const handleDeleteNotebook = async () => {
    if (!id || deleteNotebookMutation.isPending) {
      return
    }

    try {
      await deleteNotebookMutation.mutateAsync(id)
      resetWorkspace()
      await queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
      navigate('/')
    } catch (error) {
      console.warn('delete notebook failed', id, error)
      throw error
    }
  }

  const getLeftPanelWidthBounds = useCallback(
    (containerWidth: number, rightPanelWidth: number, rightPanelCollapsed: boolean) => {
      const maxByRatio = Math.floor(containerWidth * workspacePanelMaxWidthRatio)
      const rightVisibleWidth = rightPanelCollapsed ? 0 : rightPanelWidth
      const rightHandleWidth = rightPanelCollapsed ? 0 : workspaceResizeHandleWidthPx
      const maxByCenter =
        containerWidth -
        workspaceCenterMinWidthPx -
        rightVisibleWidth -
        rightHandleWidth -
        workspaceResizeHandleWidthPx
      const maxWidth = Math.max(0, Math.min(maxByRatio, maxByCenter))
      const minWidth = Math.min(workspacePanelMinWidthPx, maxWidth)
      return { minWidth, maxWidth }
    },
    [],
  )

  const getRightPanelWidthBounds = useCallback(
    (containerWidth: number, leftPanelWidth: number, leftPanelCollapsed: boolean) => {
      const maxByRatio = Math.floor(containerWidth * workspacePanelMaxWidthRatio)
      const leftVisibleWidth = leftPanelCollapsed ? 0 : leftPanelWidth
      const leftHandleWidth = leftPanelCollapsed ? 0 : workspaceResizeHandleWidthPx
      const maxByCenter =
        containerWidth -
        workspaceCenterMinWidthPx -
        leftVisibleWidth -
        leftHandleWidth -
        workspaceResizeHandleWidthPx
      const maxWidth = Math.max(0, Math.min(maxByRatio, maxByCenter))
      const minWidth = Math.min(workspacePanelMinWidthPx, maxWidth)
      return { minWidth, maxWidth }
    },
    [],
  )

  useEffect(() => {
    if (workspaceContainerWidthPx <= 0) {
      return
    }

    let nextSourcesCollapsed = isSourcesPanelCollapsed
    let nextInsightsCollapsed = isInsightsPanelCollapsed
    let nextSourcesWidth = Math.round(sourcesPanelWidthPx)
    let nextInsightsWidth = Math.round(insightsPanelWidthPx)

    for (let i = 0; i < 2; i += 1) {
      if (!nextSourcesCollapsed) {
        const leftBounds = getLeftPanelWidthBounds(
          workspaceContainerWidthPx,
          nextInsightsWidth,
          nextInsightsCollapsed,
        )
        if (leftBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
          nextSourcesCollapsed = true
        } else {
          nextSourcesWidth = Math.round(
            clampNumber(nextSourcesWidth, leftBounds.minWidth, leftBounds.maxWidth),
          )
        }
      }

      if (!nextInsightsCollapsed) {
        const rightBounds = getRightPanelWidthBounds(
          workspaceContainerWidthPx,
          nextSourcesWidth,
          nextSourcesCollapsed,
        )
        if (rightBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
          nextInsightsCollapsed = true
        } else {
          nextInsightsWidth = Math.round(
            clampNumber(nextInsightsWidth, rightBounds.minWidth, rightBounds.maxWidth),
          )
        }
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyPanelSizingState({
      nextSourcesCollapsed,
      nextInsightsCollapsed,
      nextSourcesWidth,
      nextInsightsWidth,
    })
  }, [
    applyPanelSizingState,
    getLeftPanelWidthBounds,
    getRightPanelWidthBounds,
    insightsPanelWidthPx,
    isInsightsPanelCollapsed,
    isSourcesPanelCollapsed,
    sourcesPanelWidthPx,
    workspaceContainerWidthPx,
  ])

  const startResizePanel = useCallback(
    (side: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const container = workspacePanelsRef.current
      if (!container) return

      event.preventDefault()
      setActiveResizeSide(side)

      const previousUserSelect = document.body.style.userSelect
      const previousCursor = document.body.style.cursor
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      const initialRect = container.getBoundingClientRect()
      const containerWidth = initialRect.width
      if (containerWidth <= 0) {
        document.body.style.userSelect = previousUserSelect
        document.body.style.cursor = previousCursor
        setActiveResizeSide(null)
        return
      }
      let nextSourcesCollapsed = sourcesPanelCollapsedRef.current
      let nextInsightsCollapsed = insightsPanelCollapsedRef.current
      let nextSourcesWidth = Math.round(sourcesPanelWidthRef.current)
      let nextInsightsWidth = Math.round(insightsPanelWidthRef.current)
      let latestClientX = event.clientX
      let resizeFrameId: number | null = null

      const applyResizeByClientX = (clientX: number) => {
        if (side === 'left') {
          const rawLeftWidth = clientX - initialRect.left
          if (rawLeftWidth <= workspacePanelAutoCollapseWidthPx) {
            if (!nextSourcesCollapsed) {
              nextSourcesCollapsed = true
              applyWorkspacePanelGridColumns(container, {
                sourcesCollapsed: nextSourcesCollapsed,
                insightsCollapsed: nextInsightsCollapsed,
                sourcesWidth: nextSourcesWidth,
                insightsWidth: nextInsightsWidth,
              })
            }
            return
          }

          const leftBounds = getLeftPanelWidthBounds(
            containerWidth,
            nextInsightsWidth,
            nextInsightsCollapsed,
          )
          if (leftBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
            if (!nextSourcesCollapsed) {
              nextSourcesCollapsed = true
              applyWorkspacePanelGridColumns(container, {
                sourcesCollapsed: nextSourcesCollapsed,
                insightsCollapsed: nextInsightsCollapsed,
                sourcesWidth: nextSourcesWidth,
                insightsWidth: nextInsightsWidth,
              })
            }
            return
          }

          const nextLeftWidth = Math.round(
            clampNumber(rawLeftWidth, leftBounds.minWidth, leftBounds.maxWidth),
          )

          if (nextSourcesCollapsed || nextSourcesWidth !== nextLeftWidth) {
            nextSourcesCollapsed = false
            nextSourcesWidth = nextLeftWidth
            applyWorkspacePanelGridColumns(container, {
              sourcesCollapsed: nextSourcesCollapsed,
              insightsCollapsed: nextInsightsCollapsed,
              sourcesWidth: nextSourcesWidth,
              insightsWidth: nextInsightsWidth,
            })
          }
          return
        }

        const rawRightWidth = initialRect.right - clientX
        if (rawRightWidth <= workspacePanelAutoCollapseWidthPx) {
          if (!nextInsightsCollapsed) {
            nextInsightsCollapsed = true
            applyWorkspacePanelGridColumns(container, {
              sourcesCollapsed: nextSourcesCollapsed,
              insightsCollapsed: nextInsightsCollapsed,
              sourcesWidth: nextSourcesWidth,
              insightsWidth: nextInsightsWidth,
            })
          }
          return
        }

        const rightBounds = getRightPanelWidthBounds(
          containerWidth,
          nextSourcesWidth,
          nextSourcesCollapsed,
        )
        if (rightBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
          if (!nextInsightsCollapsed) {
            nextInsightsCollapsed = true
            applyWorkspacePanelGridColumns(container, {
              sourcesCollapsed: nextSourcesCollapsed,
              insightsCollapsed: nextInsightsCollapsed,
              sourcesWidth: nextSourcesWidth,
              insightsWidth: nextInsightsWidth,
            })
          }
          return
        }
        const nextRightWidth = Math.round(
          clampNumber(rawRightWidth, rightBounds.minWidth, rightBounds.maxWidth),
        )

        if (nextInsightsCollapsed || nextInsightsWidth !== nextRightWidth) {
          nextInsightsCollapsed = false
          nextInsightsWidth = nextRightWidth
          applyWorkspacePanelGridColumns(container, {
            sourcesCollapsed: nextSourcesCollapsed,
            insightsCollapsed: nextInsightsCollapsed,
            sourcesWidth: nextSourcesWidth,
            insightsWidth: nextInsightsWidth,
          })
        }
      }

      const scheduleResizeFrame = () => {
        if (resizeFrameId !== null) {
          return
        }
        resizeFrameId = window.requestAnimationFrame(() => {
          resizeFrameId = null
          applyResizeByClientX(latestClientX)
        })
      }

      const onPointerMove = (moveEvent: PointerEvent) => {
        latestClientX = moveEvent.clientX
        scheduleResizeFrame()
      }

      const stopResize = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', stopResize)
        window.removeEventListener('pointercancel', stopResize)
        if (resizeFrameId !== null) {
          window.cancelAnimationFrame(resizeFrameId)
          resizeFrameId = null
        }
        applyResizeByClientX(latestClientX)
        document.body.style.userSelect = previousUserSelect
        document.body.style.cursor = previousCursor
        sourcesPanelCollapsedRef.current = nextSourcesCollapsed
        insightsPanelCollapsedRef.current = nextInsightsCollapsed
        sourcesPanelWidthRef.current = nextSourcesWidth
        insightsPanelWidthRef.current = nextInsightsWidth
        setIsSourcesPanelCollapsed(nextSourcesCollapsed)
        setIsInsightsPanelCollapsed(nextInsightsCollapsed)
        if (!nextSourcesCollapsed) {
          setSourcesPanelWidthPx(nextSourcesWidth)
        }
        if (!nextInsightsCollapsed) {
          setInsightsPanelWidthPx(nextInsightsWidth)
        }
        setActiveResizeSide(null)
        if (stopPanelResizeRef.current === stopResize) {
          stopPanelResizeRef.current = null
        }
      }

      stopPanelResizeRef.current = stopResize
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', stopResize)
      window.addEventListener('pointercancel', stopResize)
    },
    [getLeftPanelWidthBounds, getRightPanelWidthBounds],
  )

  const handleExpandSourcesPanel = useCallback(() => {
    const containerWidth =
      workspaceContainerWidthPx || workspacePanelsRef.current?.getBoundingClientRect().width || 0
    if (containerWidth <= 0) {
      setIsSourcesPanelCollapsed(false)
      setSourcesPanelWidthPx(workspacePanelDefaultWidthPx)
      return
    }

    const leftBounds = getLeftPanelWidthBounds(
      containerWidth,
      insightsPanelWidthRef.current,
      insightsPanelCollapsedRef.current,
    )
    if (leftBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
      return
    }

    const nextWidth = Math.round(
      clampNumber(
        Math.max(sourcesPanelWidthRef.current, workspacePanelDefaultWidthPx),
        leftBounds.minWidth,
        leftBounds.maxWidth,
      ),
    )
    setIsSourcesPanelCollapsed(false)
    setSourcesPanelWidthPx(nextWidth)
  }, [getLeftPanelWidthBounds, workspaceContainerWidthPx])

  const handleExpandInsightsPanel = useCallback(() => {
    const containerWidth =
      workspaceContainerWidthPx || workspacePanelsRef.current?.getBoundingClientRect().width || 0
    if (containerWidth <= 0) {
      setIsInsightsPanelCollapsed(false)
      setInsightsPanelWidthPx(workspacePanelDefaultWidthPx)
      return
    }

    const rightBounds = getRightPanelWidthBounds(
      containerWidth,
      sourcesPanelWidthRef.current,
      sourcesPanelCollapsedRef.current,
    )
    if (rightBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
      return
    }

    const nextWidth = Math.round(
      clampNumber(
        Math.max(insightsPanelWidthRef.current, workspacePanelDefaultWidthPx),
        rightBounds.minWidth,
        rightBounds.maxWidth,
      ),
    )
    setIsInsightsPanelCollapsed(false)
    setInsightsPanelWidthPx(nextWidth)
  }, [getRightPanelWidthBounds, workspaceContainerWidthPx])

  const handleOpenCitationJump = useCallback((request: ChatCitationJumpRequest) => {
    handleExpandSourcesPanel()
    citationPreviewRequestSeqRef.current += 1
    setCitationPreviewRequest({
      ...request,
      requestId: citationPreviewRequestSeqRef.current,
    })
  }, [handleExpandSourcesPanel])

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <SourceSelectionController
        notebookId={id}
        sourceListItems={sourceListItems}
        selectableSourceItems={selectableSourceItems}
        selectedSourceIds={selectedSourceIds}
        isHydratingSources={isHydratingSources}
        onSelectedSourceIdsChange={setSelectedSourceIds}
      />
      <WorkspaceHeader
        notebookName={notebookMeta.name}
        isFetching={notebookQuery.isFetching}
        isUpdatingName={updateNotebookNameMutation.isPending}
        isDeletingNotebook={deleteNotebookMutation.isPending}
        onNotebookNameChange={handleNotebookNameChange}
        onNotebookNameFocus={handleNotebookNameFocus}
        onNotebookNameBlur={() => {
          void handleNotebookNameBlur()
        }}
        onDeleteNotebook={handleDeleteNotebook}
      />

      <Box sx={{ width: '100%', flex: 1, minHeight: 0, px: 1, py: 1, overflow: 'hidden' }}>
        <Box
          ref={workspacePanelsRef}
          sx={{
            display: 'grid',
            gap: { xs: 1, md: 0 },
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            gridTemplateColumns: {
              xs: '1fr',
              md: `var(${workspaceSourcesColumnVar}, ${workspacePanelDefaultWidthPx}px) var(${workspaceLeftHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) minmax(${workspaceCenterMinWidthPx}px, 1fr) var(${workspaceRightHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) var(${workspaceInsightsColumnVar}, ${workspacePanelDefaultWidthPx}px)`,
              xl: `var(${workspaceSourcesColumnVar}, ${workspacePanelDefaultWidthPx}px) var(${workspaceLeftHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) minmax(${workspaceCenterMinWidthPx}px, 1fr) var(${workspaceRightHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) var(${workspaceInsightsColumnVar}, ${workspacePanelDefaultWidthPx}px)`,
            },
            gridTemplateRows: {
              xs: 'repeat(3, minmax(0, 1fr))',
              md: 'minmax(0, 1fr)',
            },
            transition: activeResizeSide ? 'none' : workspacePanelGridTransition,
            '& > *': {
              minWidth: 0,
              minHeight: 0,
            },
          }}
        >
          <SourcesPanel
            collapsed={isSourcesPanelCollapsed}
            isBusy={isBusy}
            isHydrating={isHydratingSources}
            isPanelResizing={Boolean(activeResizeSide)}
            loadingSkeletonCount={notebookQuery.data?.source_count ?? 0}
            sourceListItems={sourceListItems}
            removingMap={removingSourceIds}
            allSourcesChecked={allSourcesChecked}
            someSourcesChecked={someSourcesChecked}
            onCollapse={() => setIsSourcesPanelCollapsed(true)}
            onCreateFile={handleCreateFileSources}
            onCreateUrl={(url) => handleCreateSimpleSource('url', url)}
            onCreateText={(text) => handleCreateSimpleSource('text', text)}
            onToggleAll={toggleAllSourceChecked}
            onToggleItem={toggleSourceItemChecked}
            onDeleteItem={handleDeleteSource}
            onRetryItem={handleRetrySource}
            onRenameItem={handleRenameSourceTitle}
            checkedMap={selectedSourceIds}
            previewRequest={citationPreviewRequest}
          />

          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="调整来源面板宽度"
            onPointerDown={startResizePanel('left')}
            sx={{
              display: { xs: 'none', md: 'block' },
              cursor: isSourcesPanelCollapsed ? 'default' : 'col-resize',
              touchAction: 'none',
              pointerEvents: isSourcesPanelCollapsed ? 'none' : 'auto',
              opacity: isSourcesPanelCollapsed ? 0 : 1,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 2,
                borderRadius: 999,
                transform: 'translateX(-50%)',
                bgcolor: activeResizeSide === 'left' ? 'primary.main' : 'divider',
                transition: 'background-color 160ms ease',
              },
              '&:hover::before': {
                bgcolor: activeResizeSide === 'left' ? 'primary.main' : 'text.disabled',
              },
            }}
          />

          <ChatPanel
            notebookId={id}
            chatId={notebookChatQuery.data?.chat_id ?? ''}
            notebookName={notebookMeta.name}
            notebookDescription={notebookMeta.desc}
            notebookSourceCount={notebookMeta.sourceCount}
            selectedSourceIds={selectedSourceIdList}
            sourcesPanelCollapsed={isSourcesPanelCollapsed}
            insightsPanelCollapsed={isInsightsPanelCollapsed}
            onExpandSourcesPanel={handleExpandSourcesPanel}
            onExpandInsightsPanel={handleExpandInsightsPanel}
            onOpenCitationJump={handleOpenCitationJump}
          />

          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="调整右侧面板宽度"
            onPointerDown={startResizePanel('right')}
            sx={{
              display: { xs: 'none', md: 'block' },
              cursor: isInsightsPanelCollapsed ? 'default' : 'col-resize',
              touchAction: 'none',
              pointerEvents: isInsightsPanelCollapsed ? 'none' : 'auto',
              opacity: isInsightsPanelCollapsed ? 0 : 1,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 2,
                borderRadius: 999,
                transform: 'translateX(-50%)',
                bgcolor: activeResizeSide === 'right' ? 'primary.main' : 'divider',
                transition: 'background-color 160ms ease',
              },
              '&:hover::before': {
                bgcolor: activeResizeSide === 'right' ? 'primary.main' : 'text.disabled',
              },
            }}
          />

          <Box
            sx={{
              width: { xs: '100%', md: isInsightsPanelCollapsed ? 0 : '100%' },
              height: '100%',
              minWidth: 0,
              overflow: 'hidden',
              transition: workspacePanelWidthTransition,
              ...(activeResizeSide ? { transition: 'none' } : null),
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                opacity: { xs: 1, md: isInsightsPanelCollapsed ? 0 : 1 },
                transform: { xs: 'translateX(0)', md: isInsightsPanelCollapsed ? 'translateX(100%)' : 'translateX(0)' },
                transition: activeResizeSide ? 'none' : workspacePanelContentTransition,
                pointerEvents: { xs: 'auto', md: isInsightsPanelCollapsed ? 'none' : 'auto' },
              }}
            >
              <StudioPanel
                notebookId={id}
                selectedSourceIds={selectedSourceIdList}
                readySourceIds={readySourceIdList}
                onCollapse={() => setIsInsightsPanelCollapsed(true)}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
