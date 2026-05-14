import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Dialog, DialogContent, DialogTitle, Fade, Link, Typography } from '@mui/material'
import {
  createSource,
  deleteSource,
  retrySourcePreparation,
  uploadFileSource,
  uploadToObjectStorage,
} from '../api/source'
import {
  getNotebook,
  getOrCreateNotebookChat,
  listNotebookSources,
  updateNotebookName,
} from '../api/notebook'
import { fileMd5 } from '../lib/md5'
import { resolveUploadMimeType } from '../lib/sourceMime'
import { useSourcePolling } from '../hooks/useSourcePolling'
import { type SourceCard, useWorkspaceStore } from '../store/workspace'
import type { Notebook, SourceKind, SourceStatus } from '../types/api'
import { ChatPanel } from '../components/notebook-workspace/ChatPanel'
import { InsightsPanel } from '../components/notebook-workspace/InsightsPanel'
import { MarkdownRenderer } from '../components/notebook-workspace/MarkdownRenderer'
import { SourceSelectionController } from '../components/notebook-workspace/SourceSelectionController'
import { SourcesPanel } from '../components/notebook-workspace/SourcesPanel'
import { WorkspaceHeader } from '../components/notebook-workspace/WorkspaceHeader'
import type { SourceListItem } from '../components/notebook-workspace/sourceTypes'

const processingStatusSet = new Set<SourceStatus>(['uploading', 'preparing'])
const notebookSourcesPageLimit = 50
const sourceRemoveAnimationMs = 300
const textSourceDisplayNameMaxChars = 20
const markdownPreviewCacheTtlMs = 5 * 60 * 1_000
const workspacePanelWidthCollapsed = '0%'
const workspacePanelWidthExpanded = '23%'
const workspacePanelTransitionMs = 280
const workspacePanelFadeTransitionMs = 220
const workspacePanelTransitionCurve = 'cubic-bezier(0.22, 1, 0.36, 1)'
const workspacePanelGridTransition = `grid-template-columns ${workspacePanelTransitionMs}ms ${workspacePanelTransitionCurve}`
const workspacePanelWidthTransition = `width ${workspacePanelTransitionMs}ms ${workspacePanelTransitionCurve}`
const workspacePanelContentTransition = `transform ${workspacePanelTransitionMs}ms ${workspacePanelTransitionCurve}, opacity ${workspacePanelFadeTransitionMs}ms ease`
const previewDialogTransitionDuration = { enter: 180, exit: 120 }
const previewDialogContentHeight = {
  min: { xs: 300, md: 460 },
  max: { xs: '65vh', md: 460 },
}
const previewDialogTextFontSize = 13.5
const filePreviewStackGap = 1.25
const filePreviewFrameMinHeight = 460
const filePreviewLinkFontSize = 12
const previewableFileIconTypeSet = new Set<SourceListItem['iconType']>([
  'markdown',
  'pdf',
  'txt',
])

const isProcessingStatus = (status?: SourceStatus) =>
  !!status && processingStatusSet.has(status)

const detectSourceIconType = (
  kind: SourceKind,
  displayName: string,
) => {
  if (kind === 'text') return 'text'
  if (kind === 'url') return 'url'

  if (/\.pdf$/i.test(displayName)) return 'pdf'
  if (/\.epub$/i.test(displayName)) return 'epub'
  if (/\.txt$/i.test(displayName)) return 'txt'
  if (/\.md$/i.test(displayName) || /\.markdown$/i.test(displayName)) {
    return 'markdown'
  }
  return 'docx'
}

const truncateUTF8 = (text: string, maxChars: number) => {
  const chars = Array.from(text)
  if (chars.length <= maxChars) {
    return text
  }
  return chars.slice(0, maxChars).join('')
}

const canPreviewSourceItem = (item: SourceListItem) =>
  item.kind === 'text' ||
  (item.kind === 'file' && previewableFileIconTypeSet.has(item.iconType))

export function NotebookWorkspacePage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [isSourcesPanelCollapsed, setIsSourcesPanelCollapsed] = useState(false)
  const [isInsightsPanelCollapsed, setIsInsightsPanelCollapsed] = useState(false)
  const [selectedSourceIds, setSelectedSourceIds] = useState<Record<string, boolean>>({})
  const [removingSourceIds, setRemovingSourceIds] = useState<Record<string, boolean>>({})
  const [isHydratingSources, setIsHydratingSources] = useState(false)
  const [previewingSourceId, setPreviewingSourceId] = useState<string | null>(null)
  const [previewDialogItem, setPreviewDialogItem] = useState<SourceListItem | null>(null)
  const [notebookNameDraft, setNotebookNameDraft] = useState('')
  const [isNotebookNameEditing, setIsNotebookNameEditing] = useState(false)

  const sources = useWorkspaceStore((s) => s.sources)
  const addSource = useWorkspaceStore((s) => s.addSource)
  const patchSource = useWorkspaceStore((s) => s.patchSource)
  const removeSource = useWorkspaceStore((s) => s.removeSource)
  const setSources = useWorkspaceStore((s) => s.setSources)
  const setSourceStatus = useWorkspaceStore((s) => s.setSourceStatus)
  const resetWorkspace = useWorkspaceStore((s) => s.reset)
  const removeSourceTimersRef = useRef<number[]>([])

  useEffect(() => {
    resetWorkspace()
    setRemovingSourceIds({})
    setIsHydratingSources(true)
    setPreviewingSourceId(null)
    setPreviewDialogItem(null)
  }, [id, resetWorkspace])

  useEffect(() => {
    return () => {
      removeSourceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      removeSourceTimersRef.current = []
    }
  }, [])

  useSourcePolling({
    notebookId: id,
    sources,
    removingSourceIds,
    setSourceStatus,
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
    if (!id || !notebook) return

    let cancelled = false
    setIsHydratingSources(true)
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
            displayName: source.display_name,
            textContent: source.text?.text,
            urlContent: source.url?.url,
            fileUrl: source.file?.url,
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
  }, [id, notebookQuery.data, setSources])

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
  const updateNotebookNameMutation = useMutation({
    mutationFn: ({ notebookId, name }: { notebookId: string; name: string }) =>
      updateNotebookName(notebookId, { name }),
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
      name: source.displayName?.trim() ? source.displayName : source.id,
      iconType: detectSourceIconType(source.kind, source.displayName ?? ''),
      status: source.status,
      textContent: source.textContent,
      urlContent: source.urlContent,
      fileUrl: source.fileUrl,
    }))
  }, [sources])

  const previewingSourceItem = useMemo(
    () => sourceListItems.find((item) => item.id === previewingSourceId) ?? null,
    [previewingSourceId, sourceListItems],
  )
  const activePreviewItem = previewingSourceItem ?? previewDialogItem
  const isPreviewDialogOpen = Boolean(previewingSourceId)
  const isPreviewingMarkdown = activePreviewItem?.iconType === 'markdown'
  const markdownTextFromSource =
    isPreviewingMarkdown ? activePreviewItem?.textContent ?? '' : ''
  const markdownPreviewFileUrl =
    isPreviewingMarkdown && activePreviewItem?.fileUrl
      ? activePreviewItem.fileUrl
      : ''
  const markdownPreviewFallbackQuery = useQuery({
    queryKey: ['source-markdown-preview', activePreviewItem?.id ?? '', markdownPreviewFileUrl],
    enabled: Boolean(
      isPreviewDialogOpen &&
        isPreviewingMarkdown &&
        !markdownTextFromSource.trim() &&
        markdownPreviewFileUrl,
    ),
    queryFn: async () => {
      const response = await fetch(markdownPreviewFileUrl, { credentials: 'omit' })
      if (!response.ok) {
        throw new Error(`request failed: ${response.status}`)
      }
      return response.text()
    },
    staleTime: markdownPreviewCacheTtlMs,
  })
  const markdownPreviewText =
    markdownTextFromSource || markdownPreviewFallbackQuery.data || ''
  const hasMarkdownPreviewText = Boolean(markdownPreviewText.trim())

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
        displayName: kind === 'text' ? truncateUTF8(normalized, textSourceDisplayNameMaxChars) : normalized,
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
      addSource({
        id: created.id,
        kind: 'file',
        status: 'uploading',
        displayName: file.name,
      })

      const md5 = await fileMd5(file)
      const uploadConfig = await uploadSourceMutation.mutateAsync({
        sourceId: created.id,
        payload: {
          mime_type: resolveUploadMimeType(file),
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
        setPreviewingSourceId((prev) => (prev === sourceId ? null : prev))
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

  const handlePreviewSource = (sourceId: string) => {
    const targetSource = sourceListItems.find((item) => item.id === sourceId)
    if (!targetSource) return
    if (!canPreviewSourceItem(targetSource)) return
    setPreviewDialogItem(targetSource)
    if (targetSource.kind !== 'file' || targetSource.fileUrl) {
      setPreviewingSourceId(sourceId)
      return
    }
    if (!id) {
      setPreviewingSourceId(sourceId)
      return
    }

    void (async () => {
      try {
        let offset = 0
        while (true) {
          const page = await listNotebookSources(id, {
            limit: notebookSourcesPageLimit,
            offset,
          })
          const matched = page.sources.find((source) => source.id === sourceId)
          if (matched) {
            patchSource(sourceId, {
              status: matched.status,
              displayName: matched.display_name,
              textContent: matched.text?.text,
              urlContent: matched.url?.url,
              fileUrl: matched.file?.url,
            })
            break
          }
          if (!page.has_more || page.sources.length === 0) {
            break
          }
          offset += page.sources.length
        }
      } catch (error) {
        console.warn('refresh source before preview failed', sourceId, error)
      } finally {
        setPreviewingSourceId(sourceId)
      }
    })()
  }

  const handleClosePreviewDialog = () => {
    if (previewingSourceItem) {
      setPreviewDialogItem(previewingSourceItem)
    }
    setPreviewingSourceId(null)
  }

  const handlePreviewDialogExited = () => {
    setPreviewDialogItem(null)
  }

  const handleNotebookNameFocus = () => {
    setNotebookNameDraft(notebookQuery.data?.name ?? '')
    setIsNotebookNameEditing(true)
  }

  const handleNotebookNameBlur = async () => {
    if (!id) {
      setIsNotebookNameEditing(false)
      return
    }

    const currentName = notebookQuery.data?.name ?? ''
    const nextName = notebookNameDraft.trim()
    if (!nextName || nextName === currentName) {
      setNotebookNameDraft(currentName)
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
      console.warn('update notebook name failed', error)
    }
  }

  const notebookName = isNotebookNameEditing
    ? notebookNameDraft
    : notebookQuery.data?.name ?? ''

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
        notebookName={notebookName}
        isFetching={notebookQuery.isFetching}
        isUpdatingName={updateNotebookNameMutation.isPending}
        onNotebookNameChange={setNotebookNameDraft}
        onNotebookNameFocus={handleNotebookNameFocus}
        onNotebookNameBlur={() => {
          void handleNotebookNameBlur()
        }}
      />

      <Box sx={{ width: '100%', flex: 1, minHeight: 0, px: 1, py: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            gridTemplateColumns: {
              xs: '1fr',
              md: `${isSourcesPanelCollapsed ? workspacePanelWidthCollapsed : workspacePanelWidthExpanded} minmax(0, 1fr) ${isInsightsPanelCollapsed ? workspacePanelWidthCollapsed : workspacePanelWidthExpanded}`,
              xl: `${isSourcesPanelCollapsed ? workspacePanelWidthCollapsed : workspacePanelWidthExpanded} minmax(0, 1fr) ${isInsightsPanelCollapsed ? workspacePanelWidthCollapsed : workspacePanelWidthExpanded}`,
            },
            gridTemplateRows: {
              xs: 'repeat(3, minmax(0, 1fr))',
              md: 'minmax(0, 1fr)',
            },
            transition: workspacePanelGridTransition,
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
            onPreviewItem={handlePreviewSource}
            checkedMap={selectedSourceIds}
          />

          <ChatPanel
            notebookId={id}
            chatId={notebookChatQuery.data?.chat_id ?? ''}
            selectedSourceIds={selectedSourceIdList}
            sourcesPanelCollapsed={isSourcesPanelCollapsed}
            insightsPanelCollapsed={isInsightsPanelCollapsed}
            onExpandSourcesPanel={() => setIsSourcesPanelCollapsed(false)}
            onExpandInsightsPanel={() => setIsInsightsPanelCollapsed(false)}
          />

          <Box
            sx={{
              width: { xs: '100%', md: isInsightsPanelCollapsed ? 0 : '100%' },
              height: '100%',
              minWidth: 0,
              overflow: 'hidden',
              transition: workspacePanelWidthTransition,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                opacity: { xs: 1, md: isInsightsPanelCollapsed ? 0 : 1 },
                transform: { xs: 'translateX(0)', md: isInsightsPanelCollapsed ? 'translateX(100%)' : 'translateX(0)' },
                transition: workspacePanelContentTransition,
                pointerEvents: { xs: 'auto', md: isInsightsPanelCollapsed ? 'none' : 'auto' },
              }}
            >
              <InsightsPanel onCollapse={() => setIsInsightsPanelCollapsed(true)} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={isPreviewDialogOpen}
        onClose={handleClosePreviewDialog}
        transitionDuration={previewDialogTransitionDuration}
        slots={{ transition: Fade }}
        slotProps={{
          transition: {
            onExited: handlePreviewDialogExited,
            easing: {
              enter: 'cubic-bezier(0.22, 1, 0.36, 1)',
              exit: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
          },
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{activePreviewItem?.name ?? '来源预览'}</DialogTitle>
        <DialogContent
          dividers
          sx={{
            minHeight: previewDialogContentHeight.min,
            maxHeight: previewDialogContentHeight.max,
            overflowY: 'auto',
          }}
        >
          {isPreviewingMarkdown ? (
            hasMarkdownPreviewText ? (
              <Box sx={{ wordBreak: 'break-word' }}>
                <MarkdownRenderer content={markdownPreviewText} />
              </Box>
            ) : markdownPreviewFallbackQuery.isFetching ? (
              <Typography sx={{ fontSize: previewDialogTextFontSize }} color="text.secondary">
                Markdown 内容加载中...
              </Typography>
            ) : markdownPreviewFallbackQuery.isError ? (
              <Typography sx={{ fontSize: previewDialogTextFontSize }} color="text.secondary">
                Markdown 内容加载失败，请稍后重试。
              </Typography>
            ) : (
              <Typography sx={{ fontSize: previewDialogTextFontSize }} color="text.secondary">
                Markdown 内容尚未准备完成，暂不可预览。
              </Typography>
            )
          ) : null}

          {activePreviewItem?.kind === 'text' ? (
            <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: previewDialogTextFontSize }}>
              {activePreviewItem.textContent?.trim() || '暂无可预览文本内容。'}
            </Typography>
          ) : null}

          {activePreviewItem?.kind === 'file' && activePreviewItem.iconType !== 'markdown' ? (
            activePreviewItem.fileUrl ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: filePreviewStackGap }}>
                <Box
                  component="iframe"
                  src={activePreviewItem.fileUrl}
                  title="source-file-preview"
                  sx={{ width: '100%', minHeight: filePreviewFrameMinHeight, border: 0, borderRadius: 1 }}
                />
                <Link
                  href={activePreviewItem.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontSize: filePreviewLinkFontSize }}
                >
                  在新标签页打开文件
                </Link>
              </Box>
            ) : (
              <Typography sx={{ fontSize: previewDialogTextFontSize }} color="text.secondary">
                文件尚未就绪，暂不可预览。
              </Typography>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
