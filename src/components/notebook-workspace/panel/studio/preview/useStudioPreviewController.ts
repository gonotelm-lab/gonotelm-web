import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import i18n from '@/i18n'
import {
  getStudioArtifact,
} from '@/api/studio'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import type { StudioArtifactTaskStatus } from '@/types/api'
import {
  buildTaskFailedMessage,
  shouldStudioTaskKeepPolling,
  toArtifactVisualStatus,
} from '../artifactStatus'
import type { StudioArtifactItem } from '../types'
import { getStudioArtifactPreviewCapability } from './previewCapabilities'
import { hasStudioArtifactPreviewContent } from './previewContent'
import { downloadStudioStorageFile, fetchStudioStorageUrl } from './fetchStudioStorageUrl'
import { isUrlBasedStudioArtifactKind } from './ensureFreshStudioContentUrl'
import { isPresignedGetUrlExpired } from './presignedUrlExpiry'
import { resolveStudioPreviewEntryMode } from './previewRouting'
import { resolveStudioArtifactDownload } from './resolveStudioArtifactDownload'

export interface StudioPreviewState {
  inlineOpen: boolean
  overlayOpen: boolean
  targetId: string
  loading: boolean
  content: string
  contentUrl: string
  error: string
  /** overlay 打开时定位到的 slides 页（0-based） */
  overlaySlideIndex: number
}

const defaultStudioPreviewState: StudioPreviewState = {
  inlineOpen: false,
  overlayOpen: false,
  targetId: '',
  loading: false,
  content: '',
  contentUrl: '',
  error: '',
  overlaySlideIndex: 0,
}

interface UseStudioPreviewControllerParams {
  artifactItems: StudioArtifactItem[]
  onArtifactContentUrlUpdated?: (artifactId: string, contentUrl: string) => void
}

const buildStudioPreviewErrorMessage = (
  error: unknown,
  fallbackKey = 'studio:preview.loadFailed',
) => apiErrorMessage(error, fallbackKey)

export function useStudioPreviewController({
  artifactItems,
  onArtifactContentUrlUpdated,
}: UseStudioPreviewControllerParams) {
  const [previewState, setPreviewState] = useState<StudioPreviewState>(
    defaultStudioPreviewState,
  )
  const artifactItemsRef = useRef(artifactItems)
  const previewLoadSeqRef = useRef(0)
  const onArtifactContentUrlUpdatedRef = useRef(onArtifactContentUrlUpdated)
  onArtifactContentUrlUpdatedRef.current = onArtifactContentUrlUpdated

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

      const urlBased = isUrlBasedStudioArtifactKind(latestItem.kind)
      const shouldRefreshArtifact =
        Boolean(latestItem.taskId) &&
        ((!content && !contentUrl) ||
          (urlBased &&
            (!contentUrl.trim() || isPresignedGetUrlExpired(contentUrl))))

      if (shouldRefreshArtifact) {
        const previousUrl = contentUrl
        const result = await getStudioArtifact(latestItem.taskId)
        if (previewLoadSeqRef.current !== requestSeq) {
          return
        }
        content = result.content ?? content
        contentUrl = result.content_url ?? contentUrl
        taskStatus = result.status
        itemStatus = toArtifactVisualStatus(result.status)
        if (contentUrl.trim() && contentUrl !== previousUrl) {
          onArtifactContentUrlUpdatedRef.current?.(latestItem.id, contentUrl)
        }
      }

      if (shouldStudioTaskKeepPolling(taskStatus)) {
        setPreviewState((prev) =>
          prev.targetId === latestItem.id
            ? {
                ...prev,
                loading: false,
                error: i18n.t('studio:preview.taskNotDone'),
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

      if (!content && contentUrl && !urlBased) {
        const response = await fetchStudioStorageUrl({
          url: contentUrl,
          taskId: latestItem.taskId,
          onUrlRefreshed: (nextUrl) => {
            contentUrl = nextUrl
            onArtifactContentUrlUpdatedRef.current?.(latestItem.id, nextUrl)
          },
        })
        content = await response.text()
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
                : i18n.t('studio:preview.emptyArtifact'),
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

  const openOverlayFromInline = useCallback((slideIndex?: number) => {
    if (!previewTarget || !previewCapability?.overlay) {
      return
    }
    const nextSlideIndex =
      typeof slideIndex === 'number' && Number.isFinite(slideIndex) && slideIndex >= 0
        ? Math.floor(slideIndex)
        : 0
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
      setPreviewState((prev) => ({
        ...prev,
        overlayOpen: true,
        overlaySlideIndex: nextSlideIndex,
      }))
      return
    }
    setPreviewState((prev) => ({
      ...prev,
      overlaySlideIndex: nextSlideIndex,
    }))
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
    setPreviewState((prev) => ({
      ...prev,
      overlayOpen: false,
      overlaySlideIndex: 0,
    }))
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

  const updatePreviewContentUrl = useCallback((nextUrl: string) => {
    const trimmed = nextUrl.trim()
    if (!trimmed) {
      return
    }
    setPreviewState((prev) => {
      if (!prev.targetId) {
        return prev
      }
      onArtifactContentUrlUpdatedRef.current?.(prev.targetId, trimmed)
      return {
        ...prev,
        contentUrl: trimmed,
      }
    })
  }, [])

  const downloadPreviewContent = useCallback(() => {
    if (!previewTarget) {
      return
    }
    const plan = resolveStudioArtifactDownload({
      kind: previewTarget.kind,
      title: previewTarget.title,
      content: previewState.content,
      contentUrl: previewState.contentUrl || previewTarget.contentUrl,
    })
    if (!plan) {
      return
    }

    if (plan.type === 'url') {
      void downloadStudioStorageFile({
        url: plan.url,
        filename: plan.filename,
        taskId: previewTarget.taskId,
        onUrlRefreshed: updatePreviewContentUrl,
      }).catch(() => {
        // Fallback keeps current behavior when cross-origin download is blocked.
        const anchor = document.createElement('a')
        anchor.href = plan.url
        anchor.download = plan.filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      })
      return
    }

    const blob = new Blob([plan.content], { type: 'text/plain;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = plan.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }, [
    previewState.content,
    previewState.contentUrl,
    previewTarget,
    updatePreviewContentUrl,
  ])

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
    updatePreviewContentUrl,
  }
}
