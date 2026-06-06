import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildSourceParsedContentQueryOptions,
  buildSourceParsedContentUrlQueryOptions,
  getSourceParsedTree,
} from '@/api/source'
import { ApiError } from '@/lib/http'
import { useQueryClient } from '@tanstack/react-query'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import type { ChatCitationJumpRequest } from '../../chat/types'
import type { SourceListItem } from '../types/sourceTypes'
import {
  expandHighlightRangeToLineBoundaries,
  resolveHighlightRangeByRunePosition,
  resolveHighlightRangeBySnippet,
  type SourceHighlightRange,
} from './sourcePreviewMarkdown'
import { getSourcePreviewCapability } from './sourcePreviewCapabilities'
import { resolveSourcePreviewEntryMode } from './sourcePreviewRouting'
import type { SourcePreviewViewType } from './types'

const sourcePreviewEmptyNotice = '当前来源暂无可展示的解析内容。'
const sourceMarkdownHeavyCharThreshold = 6000

const getSourcePreviewErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '预览加载失败，请稍后重试。'
}

export interface SourcePreviewRequest extends ChatCitationJumpRequest {
  requestId: number
}

export interface SourcePreviewState {
  sourceId: string
  sourceName: string
  viewType: SourcePreviewViewType
  inlineOpen: boolean
  overlayOpen: boolean
  loading: boolean
  rawMarkdown: string
  markdown: string
  highlightSnippet: string
  focusRange: SourceHighlightRange | null
  notice: string
  error: string
  locator: ChatCitationJumpRequest | null
  tree: GetSourceParsedTreeResponse | null
}

const defaultSourcePreviewState: SourcePreviewState = {
  sourceId: '',
  sourceName: '',
  viewType: 'content',
  inlineOpen: false,
  overlayOpen: false,
  loading: false,
  rawMarkdown: '',
  markdown: '',
  highlightSnippet: '',
  focusRange: null,
  notice: '',
  error: '',
  locator: null,
  tree: null,
}

interface OpenSourcePreviewParams {
  item: SourceListItem
  viewType: SourcePreviewViewType
  locator?: ChatCitationJumpRequest | null
  inlineOpen: boolean
  overlayOpen: boolean
}

interface UseSourcePreviewControllerParams {
  sourceListItems: SourceListItem[]
}

export function useSourcePreviewController({
  sourceListItems,
}: UseSourcePreviewControllerParams) {
  const queryClient = useQueryClient()
  const [previewState, setPreviewState] = useState<SourcePreviewState>(
    defaultSourcePreviewState,
  )
  const requestSeqRef = useRef(0)

  const activeCapability = useMemo(
    () => getSourcePreviewCapability(previewState.viewType),
    [previewState.viewType],
  )

  const loadSourcePreview = useCallback(async ({
    item,
    viewType,
    locator = null,
    inlineOpen,
    overlayOpen,
  }: OpenSourcePreviewParams) => {
    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    const sourceId = item.id
    const sourceName = item.name

    setPreviewState({
      sourceId,
      sourceName,
      viewType,
      inlineOpen,
      overlayOpen,
      loading: true,
      rawMarkdown: '',
      markdown: '',
      highlightSnippet: locator?.snippet?.trim() ?? '',
      focusRange: null,
      notice: '',
      error: '',
      locator,
      tree: null,
    })

    if (viewType === 'tree') {
      try {
        const tree = await getSourceParsedTree(sourceId)
        if (requestSeqRef.current !== requestSeq) {
          return
        }
        setPreviewState((prev) =>
          prev.sourceId === sourceId
            ? {
                ...prev,
                loading: false,
                tree,
                notice: tree.root ? '' : '当前来源暂无可展示的树结构。',
              }
            : prev,
        )
      } catch (error) {
        if (requestSeqRef.current !== requestSeq) {
          return
        }
        setPreviewState((prev) =>
          prev.sourceId === sourceId
            ? {
                ...prev,
                loading: false,
                error: getSourcePreviewErrorMessage(error),
              }
            : prev,
        )
      }
      return
    }

    try {
      const parsedContent = await queryClient.fetchQuery(
        buildSourceParsedContentQueryOptions(sourceId),
      )
      if (requestSeqRef.current !== requestSeq) {
        return
      }
      if (!parsedContent) {
        setPreviewState((prev) =>
          prev.sourceId === sourceId
            ? {
                ...prev,
                loading: false,
                notice: sourcePreviewEmptyNotice,
              }
            : prev,
        )
        return
      }

      let markdown = parsedContent.content?.trim() ?? ''
      if (!markdown && parsedContent.url) {
        markdown = await queryClient.fetchQuery(
          buildSourceParsedContentUrlQueryOptions(parsedContent.url),
        )
        markdown = markdown.trim()
      }

      if (requestSeqRef.current !== requestSeq) {
        return
      }

      if (!markdown) {
        setPreviewState((prev) =>
          prev.sourceId === sourceId
            ? {
                ...prev,
                loading: false,
                notice: sourcePreviewEmptyNotice,
              }
            : prev,
        )
        return
      }

      let focusRange = resolveHighlightRangeByRunePosition(markdown, locator?.position)
      if (!focusRange) {
        focusRange = resolveHighlightRangeBySnippet(markdown, locator?.snippet)
      }
      const expandedFocusRange = expandHighlightRangeToLineBoundaries(markdown, focusRange)

      setPreviewState((prev) =>
        prev.sourceId === sourceId
          ? {
              ...prev,
              loading: false,
              rawMarkdown: markdown,
              markdown,
              focusRange: expandedFocusRange,
              notice: '',
            }
          : prev,
      )
    } catch (error) {
      if (requestSeqRef.current !== requestSeq) {
        return
      }
      setPreviewState((prev) =>
        prev.sourceId === sourceId
          ? {
              ...prev,
              loading: false,
              error: getSourcePreviewErrorMessage(error),
            }
          : prev,
      )
    }
  }, [queryClient])

  const openPreviewFromMenu = useCallback((item: SourceListItem) => {
    const entryMode = resolveSourcePreviewEntryMode({
      viewType: 'content',
      status: item.status,
    })
    if (entryMode === 'none') {
      return
    }
    void loadSourcePreview({
      item,
      viewType: 'content',
      inlineOpen: entryMode === 'inline',
      overlayOpen: entryMode === 'overlay',
    })
  }, [loadSourcePreview])

  const openTreeFromMenu = useCallback((item: SourceListItem) => {
    const entryMode = resolveSourcePreviewEntryMode({
      viewType: 'tree',
      status: item.status,
    })
    if (entryMode === 'none') {
      return
    }
    void loadSourcePreview({
      item,
      viewType: 'tree',
      inlineOpen: entryMode === 'inline',
      overlayOpen: entryMode === 'overlay',
    })
  }, [loadSourcePreview])

  const openPreviewFromCitation = useCallback((item: SourceListItem, locator: ChatCitationJumpRequest) => {
    void loadSourcePreview({
      item,
      viewType: 'content',
      locator,
      inlineOpen: true,
      overlayOpen: false,
    })
  }, [loadSourcePreview])

  const closeInlinePreview = useCallback(() => {
    requestSeqRef.current += 1
    setPreviewState(defaultSourcePreviewState)
  }, [])

  const closeOverlayPreview = useCallback(() => {
    setPreviewState((prev) => ({ ...prev, overlayOpen: false }))
  }, [])

  const retryActivePreview = useCallback(() => {
    if (!previewState.sourceId) {
      return
    }
    const target = sourceListItems.find((item) => item.id === previewState.sourceId)
    if (!target) {
      return
    }
    void loadSourcePreview({
      item: target,
      viewType: previewState.viewType,
      locator: previewState.locator,
      inlineOpen: previewState.inlineOpen,
      overlayOpen: previewState.overlayOpen,
    })
  }, [
    loadSourcePreview,
    previewState.inlineOpen,
    previewState.locator,
    previewState.overlayOpen,
    previewState.sourceId,
    previewState.viewType,
    sourceListItems,
  ])

  const openOverlayFromInline = useCallback(() => {
    if (!previewState.sourceId || !activeCapability.overlay) {
      return
    }
    setPreviewState((prev) => ({ ...prev, overlayOpen: true }))
  }, [activeCapability.overlay, previewState.sourceId])

  const downloadActivePreview = useCallback(() => {
    if (!activeCapability.downloadable || previewState.viewType !== 'content') {
      return
    }
    const markdown = previewState.rawMarkdown.trim() || previewState.markdown.trim()
    if (!markdown) {
      return
    }
    const safeName = previewState.sourceName
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'source-preview'
    const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = `${safeName}.md`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }, [
    activeCapability.downloadable,
    previewState.markdown,
    previewState.rawMarkdown,
    previewState.sourceName,
    previewState.viewType,
  ])

  useEffect(() => {
    if (!previewState.sourceId) {
      return
    }
    const stillExists = sourceListItems.some((item) => item.id === previewState.sourceId)
    if (!stillExists) {
      setPreviewState(defaultSourcePreviewState)
    }
  }, [previewState.sourceId, sourceListItems])

  const isHeavyPreview = useMemo(() => {
    if (previewState.viewType !== 'content') {
      return false
    }
    return previewState.rawMarkdown.length > sourceMarkdownHeavyCharThreshold
  }, [previewState.rawMarkdown.length, previewState.viewType])

  return {
    previewState,
    activeCapability,
    openPreviewFromMenu,
    openTreeFromMenu,
    openPreviewFromCitation,
    closeInlinePreview,
    closeOverlayPreview,
    retryActivePreview,
    openOverlayFromInline,
    downloadActivePreview,
    isHeavyPreview,
  }
}
