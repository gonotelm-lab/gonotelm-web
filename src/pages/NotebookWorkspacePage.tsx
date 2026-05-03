import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Box, Dialog, DialogContent, DialogTitle, Link, Typography } from '@mui/material'
import {
  createSource,
  deleteSource,
  retrySourcePreparation,
  uploadFileSource,
  uploadToObjectStorage,
} from '../api/source'
import { getNotebook, listNotebookSources } from '../api/notebook'
import { fileMd5 } from '../lib/md5'
import { resolveUploadMimeType } from '../lib/sourceMime'
import { useSourcePolling } from '../hooks/useSourcePolling'
import { type SourceCard, useWorkspaceStore } from '../store/workspace'
import type { SourceKind, SourceStatus } from '../types/api'
import { ChatPanel } from '../components/notebook-workspace/ChatPanel'
import { InsightsPanel } from '../components/notebook-workspace/InsightsPanel'
import { SourcesPanel } from '../components/notebook-workspace/SourcesPanel'
import { WorkspaceHeader } from '../components/notebook-workspace/WorkspaceHeader'
import type { SourceListItem } from '../components/notebook-workspace/sourceTypes'

const processingStatusSet = new Set<SourceStatus>(['uploading', 'preparing'])
const notebookSourcesPageLimit = 50
const sourceRemoveAnimationMs = 300

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

export function NotebookWorkspacePage() {
  const { id = '' } = useParams()
  const [isSourcesPanelCollapsed, setIsSourcesPanelCollapsed] = useState(false)
  const [isInsightsPanelCollapsed, setIsInsightsPanelCollapsed] = useState(false)
  const [selectedSourceIds, setSelectedSourceIds] = useState<Record<string, boolean>>({})
  const [removingSourceIds, setRemovingSourceIds] = useState<Record<string, boolean>>({})
  const [previewingSourceId, setPreviewingSourceId] = useState<string | null>(null)

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
    setPreviewingSourceId(null)
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

  useEffect(() => {
    const notebook = notebookQuery.data
    if (!id || !notebook) return

    let cancelled = false
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

  useEffect(() => {
    setSelectedSourceIds((prev) => {
      const next: Record<string, boolean> = {}
      for (const item of selectableSourceItems) {
        if (prev[item.id]) {
          next[item.id] = true
        }
      }
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((key) => prev[key] === next[key])
      ) {
        return prev
      }
      return next
    })
  }, [selectableSourceItems])

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
        displayName: kind === 'text' ? truncateUTF8(normalized, 20) : normalized,
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

  const notebookName = notebookQuery.data?.name ?? 'Loading notebook...'

  return (
    <>
      <WorkspaceHeader notebookName={notebookName} isFetching={notebookQuery.isFetching} />

      <Box sx={{ width: '100%', px: 2, py: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              md: `${isSourcesPanelCollapsed ? '0%' : '23%'} minmax(0, 1fr) ${isInsightsPanelCollapsed ? '0%' : '23%'}`,
              xl: `${isSourcesPanelCollapsed ? '0%' : '23%'} minmax(0, 1fr) ${isInsightsPanelCollapsed ? '0%' : '23%'}`,
            },
            transition: 'grid-template-columns 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <SourcesPanel
            collapsed={isSourcesPanelCollapsed}
            isBusy={isBusy}
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
            sourcesPanelCollapsed={isSourcesPanelCollapsed}
            insightsPanelCollapsed={isInsightsPanelCollapsed}
            onExpandSourcesPanel={() => setIsSourcesPanelCollapsed(false)}
            onExpandInsightsPanel={() => setIsInsightsPanelCollapsed(false)}
          />

          <Box
            sx={{
              width: { xs: '100%', md: isInsightsPanelCollapsed ? 0 : '100%' },
              minWidth: 0,
              overflow: 'hidden',
              transition: 'width 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <Box
              sx={{
                width: '100%',
                opacity: { xs: 1, md: isInsightsPanelCollapsed ? 0 : 1 },
                transform: { xs: 'translateX(0)', md: isInsightsPanelCollapsed ? 'translateX(100%)' : 'translateX(0)' },
                transition:
                  'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
                pointerEvents: { xs: 'auto', md: isInsightsPanelCollapsed ? 'none' : 'auto' },
              }}
            >
              <InsightsPanel onCollapse={() => setIsInsightsPanelCollapsed(true)} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={Boolean(previewingSourceItem)}
        onClose={() => setPreviewingSourceId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{previewingSourceItem?.name ?? '来源预览'}</DialogTitle>
        <DialogContent dividers>
          {previewingSourceItem?.kind === 'text' ? (
            <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13.5 }}>
              {previewingSourceItem.textContent?.trim() || '暂无可预览文本内容。'}
            </Typography>
          ) : null}

          {previewingSourceItem?.kind === 'file' ? (
            previewingSourceItem.fileUrl ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box
                  component="iframe"
                  src={previewingSourceItem.fileUrl}
                  title="source-file-preview"
                  sx={{ width: '100%', minHeight: 460, border: 0, borderRadius: 1 }}
                />
                <Link
                  href={previewingSourceItem.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontSize: 12 }}
                >
                  在新标签页打开文件
                </Link>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 13.5 }} color="text.secondary">
                文件尚未就绪，暂不可预览。
              </Typography>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
