import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getStudioArtifactResult,
  loadStudioArtifactContentFromUrl,
} from '@/api/studio'
import { ApiError } from '@/lib/http'
import type { StudioArtifactTaskStatus } from '@/types/api'
import {
  buildTaskFailedMessage,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
} from '../artifactStatus'
import type { StudioArtifactItem } from '../types'
import { getStudioArtifactPreviewCapability } from './previewCapabilities'
import { hasStudioArtifactPreviewContent } from './previewContent'
import { downloadFileFromUrl } from './downloadFile'
import { resolveStudioPreviewEntryMode } from './previewRouting'

export interface StudioPreviewState {
  inlineOpen: boolean
  overlayOpen: boolean
  targetId: string
  loading: boolean
  content: string
  contentUrl: string
  error: string
}

const defaultStudioPreviewState: StudioPreviewState = {
  inlineOpen: false,
  overlayOpen: false,
  targetId: '',
  loading: false,
  content: '',
  contentUrl: '',
  error: '',
}

interface UseStudioPreviewControllerParams {
  artifactItems: StudioArtifactItem[]
}

const buildStudioPreviewErrorMessage = (
  error: unknown,
  fallback = '加载预览内容失败，请重试。',
) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export function useStudioPreviewController({
  artifactItems,
}: UseStudioPreviewControllerParams) {
  const [previewState, setPreviewState] = useState<StudioPreviewState>(
    defaultStudioPreviewState,
  )
  const artifactItemsRef = useRef(artifactItems)
  const previewLoadSeqRef = useRef(0)

  useEffect(() => {
    artifactItemsRef.current = artifactItems
  }, [artifactItems])

  const previewTarget = useMemo(() => {
    const item = artifactItems.find((artifact) => artifact.id === previewState.targetId) ?? null
    if (!item) {
      return null
    }
    if (previewState.targetId === item.id && previewState.contentUrl) {
      return { ...item, contentUrl: previewState.contentUrl }
    }
    return item
  }, [artifactItems, previewState.contentUrl, previewState.targetId])

  const previewCapability = useMemo(
    () => (previewTarget ? getStudioArtifactPreviewCapability(previewTarget.kind) : null),
    [previewTarget],
  )

  const loadPreviewForItem = useCallback(async (
    item: StudioArtifactItem,
    nextVisibility: Pick<StudioPreviewState, 'inlineOpen' | 'overlayOpen'>,
  ) => {
    const latestItem = artifactItemsRef.current.find((target) => target.id === item.id) ?? item
    const requestSeq = previewLoadSeqRef.current + 1
    previewLoadSeqRef.current = requestSeq

    setPreviewState((prev) => ({
      ...prev,
      inlineOpen: nextVisibility.inlineOpen,
      overlayOpen: nextVisibility.overlayOpen,
      targetId: latestItem.id,
      loading: true,
      content: prev.targetId === latestItem.id ? prev.content : '',
      contentUrl: prev.targetId === latestItem.id ? prev.contentUrl : '',
      error: '',
    }))

    try {
      let content = latestItem.content
      let contentUrl = latestItem.contentUrl
      let taskStatus: StudioArtifactTaskStatus = latestItem.status
      let itemStatus = toArtifactVisualStatus(latestItem.status)

      if (!content && !contentUrl && latestItem.taskId) {
        const result = await getStudioArtifactResult(latestItem.taskId)
        if (previewLoadSeqRef.current !== requestSeq) {
          return
        }
        content = result.content ?? ''
        contentUrl = result.content_url ?? ''
        taskStatus = result.status
        itemStatus = toArtifactVisualStatus(result.status)
      }

      if (shouldStudioTaskKeepPolling(taskStatus)) {
        setPreviewState((prev) =>
          prev.targetId === latestItem.id
            ? {
                ...prev,
                loading: false,
                error: '任务尚未完成，请稍后再试。',
              }
            : prev,
        )
        return
      }

      if (itemStatus === 'failed' || itemStatus === 'cancelled') {
        setPreviewState((prev) =>
          prev.targetId === latestItem.id
            ? {
                ...prev,
                loading: false,
                error: buildTaskFailedMessage(taskStatus),
              }
            : prev,
        )
        return
      }

      if (!content && contentUrl && latestItem.kind !== 'info_graphic') {
        content = await loadStudioArtifactContentFromUrl(contentUrl)
        if (previewLoadSeqRef.current !== requestSeq) {
          return
        }
      }

      setPreviewState((prev) =>
        prev.targetId === latestItem.id
          ? {
              ...prev,
              loading: false,
              content,
              contentUrl,
              error: hasStudioArtifactPreviewContent(latestItem.kind, content, contentUrl)
                ? ''
                : '当前产物没有可预览内容。',
            }
          : prev,
      )
    } catch (error) {
      setPreviewState((prev) =>
        prev.targetId === latestItem.id
          ? {
              ...prev,
              loading: false,
              error: buildStudioPreviewErrorMessage(error),
            }
          : prev,
      )
    }
  }, [])

  const openPreviewByItemClick = useCallback((item: StudioArtifactItem) => {
    const entryMode = resolveStudioPreviewEntryMode({
      kind: item.kind,
      status: item.status,
    })
    if (entryMode === 'inline') {
      void loadPreviewForItem(item, { inlineOpen: true, overlayOpen: false })
      return
    }
    if (entryMode === 'overlay') {
      void loadPreviewForItem(item, { inlineOpen: false, overlayOpen: true })
    }
  }, [loadPreviewForItem])

  const openOverlayFromInline = useCallback(() => {
    if (!previewTarget || !previewCapability?.overlay) {
      return
    }
    if (
      previewState.targetId === previewTarget.id &&
      !previewState.loading &&
      !previewState.error &&
      hasStudioArtifactPreviewContent(
        previewTarget.kind,
        previewState.content,
        previewState.contentUrl || previewTarget.contentUrl,
      )
    ) {
      setPreviewState((prev) => ({ ...prev, overlayOpen: true }))
      return
    }
    void loadPreviewForItem(previewTarget, {
      inlineOpen: previewState.inlineOpen,
      overlayOpen: true,
    })
  }, [
    loadPreviewForItem,
    previewCapability?.overlay,
    previewState.content,
    previewState.contentUrl,
    previewState.error,
    previewState.inlineOpen,
    previewState.loading,
    previewState.targetId,
    previewTarget,
  ])

  const closeInlinePreview = useCallback(() => {
    previewLoadSeqRef.current += 1
    setPreviewState(defaultStudioPreviewState)
  }, [])

  const closeOverlayPreview = useCallback(() => {
    setPreviewState((prev) => ({ ...prev, overlayOpen: false }))
  }, [])

  const retryPreviewLoad = useCallback(() => {
    if (!previewTarget) {
      return
    }
    void loadPreviewForItem(previewTarget, {
      inlineOpen: previewState.inlineOpen,
      overlayOpen: previewState.overlayOpen,
    })
  }, [loadPreviewForItem, previewState.inlineOpen, previewState.overlayOpen, previewTarget])

  const downloadPreviewContent = useCallback(() => {
    if (!previewTarget) {
      return
    }
    const safeName = previewTarget.title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'studio-artifact'

    if (previewTarget.kind === 'info_graphic') {
      const imageUrl = previewState.contentUrl || previewTarget.contentUrl
      if (!imageUrl.trim()) {
        return
      }
      void downloadFileFromUrl(imageUrl, `${safeName}.png`).catch(() => {
        // Fallback keeps current behavior when cross-origin download is blocked.
        const anchor = document.createElement('a')
        anchor.href = imageUrl
        anchor.download = `${safeName}.png`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
      return
    }

    if (!previewState.content.trim()) {
      return
    }
    const extension = previewTarget.kind === 'mindmap'
      ? 'mmd'
      : previewTarget.kind === 'report'
        ? 'md'
        : 'txt'
    const blob = new Blob([previewState.content], { type: 'text/plain;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = `${safeName}.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }, [previewState.content, previewState.contentUrl, previewTarget])

  useEffect(() => {
    if (!previewState.targetId) {
      return
    }
    const stillExists = artifactItems.some((item) => item.id === previewState.targetId)
    if (!stillExists) {
      setPreviewState(defaultStudioPreviewState)
    }
  }, [artifactItems, previewState.targetId])

  return {
    previewState,
    previewTarget,
    previewCapability,
    openPreviewByItemClick,
    openOverlayFromInline,
    closeInlinePreview,
    closeOverlayPreview,
    retryPreviewLoad,
    downloadPreviewContent,
  }
}
