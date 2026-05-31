import { useCallback, useEffect, useRef, useState } from 'react'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import {
  buildSourceParsedContentQueryOptions,
  buildSourceParsedContentUrlQueryOptions,
  getSourceParsedTree,
} from '@/api/source'
import { ApiError } from '@/lib/http'
import { useQueryClient } from '@tanstack/react-query'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { AddSourceDialog } from './components/AddSourceDialog'
import { SourceParsedTreeOverlay } from './components/SourceParsedTreeOverlay'
import { SourceListRow } from './components/SourceListRow'
import type { ChatCitationJumpRequest } from '../chat/types'
import {
  MarkdownRenderer,
  PanelSubpageLayout,
  panelTitleSx,
  panelTitleVariant,
  subtleScrollbarSx,
} from '../../shared'
import type { SourceListItem } from './types/sourceTypes'

const sourceSkeletonNameWidthPattern = ['62%', '78%', '69%', '84%', '58%', '73%'] as const
const sourcePreviewEmptyNotice = '当前来源暂无可展示的解析内容。'
const sourcePreviewLoadingText = '正在加载预览内容...'

interface SourcePreviewRequest extends ChatCitationJumpRequest {
  requestId: number
}

interface SourcePreviewState {
  sourceId: string
  sourceName: string
  loading: boolean
  rawMarkdown: string
  markdown: string
  highlightSnippet: string
  focusRange: HighlightRange | null
  notice: string
  error: string
  locator: ChatCitationJumpRequest | null
}

interface SourceTreeState {
  sourceId: string
  sourceName: string
  loading: boolean
  tree: GetSourceParsedTreeResponse | null
  error: string
}

const getSourcePreviewErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '预览加载失败，请稍后重试。'
}

const toCodeUnitOffsetByRune = (text: string, runeOffset: number) => {
  if (runeOffset <= 0) {
    return 0
  }
  let codeUnitOffset = 0
  let consumedRunes = 0
  for (const rune of text) {
    if (consumedRunes >= runeOffset) {
      break
    }
    codeUnitOffset += rune.length
    consumedRunes += 1
  }
  return codeUnitOffset
}

interface HighlightRange {
  start: number
  end: number
}

const normalizeHighlightRange = (
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
): HighlightRange | null => {
  if (!text) {
    return null
  }
  const safeStart = Math.max(Math.min(startCodeUnitOffset, text.length - 1), 0)
  const safeEnd = Math.max(Math.min(endCodeUnitOffset, text.length), safeStart + 1)
  if (safeEnd <= safeStart) {
    return null
  }
  return { start: safeStart, end: safeEnd }
}

const expandHighlightRangeToLineBoundaries = (
  text: string,
  range: HighlightRange | null,
): HighlightRange | null => {
  if (!range) {
    return null
  }
  const lineStart = text.lastIndexOf('\n', Math.max(range.start - 1, 0))
  const lineEnd = text.indexOf('\n', range.end)
  return {
    start: lineStart < 0 ? 0 : lineStart + 1,
    end: lineEnd < 0 ? text.length : lineEnd,
  }
}

const resolveHighlightRangeBySnippet = (
  text: string,
  snippet?: string,
): HighlightRange | null => {
  if (!snippet) {
    return null
  }
  const normalizedSnippet = snippet.trim()
  if (!normalizedSnippet) {
    return null
  }
  const snippetStart = text.indexOf(normalizedSnippet)
  if (snippetStart < 0) {
    return null
  }
  return normalizeHighlightRange(text, snippetStart, snippetStart + normalizedSnippet.length)
}

const resolveHighlightRangeByRunePosition = (
  text: string,
  position?: { start?: number; end?: number },
): HighlightRange | null => {
  if (!position) {
    return null
  }
  const totalRunes = Array.from(text).length
  if (totalRunes <= 0) {
    return null
  }
  const safeStart = Math.min(Math.max(position.start ?? 0, 0), totalRunes - 1)
  const rawEnd = Math.min(Math.max(position.end ?? safeStart + 1, safeStart + 1), totalRunes)
  const startCodeUnitOffset = toCodeUnitOffsetByRune(text, safeStart)
  const endCodeUnitOffset = toCodeUnitOffsetByRune(text, rawEnd)
  return normalizeHighlightRange(text, startCodeUnitOffset, endCodeUnitOffset)
}

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const toLineMarkedHighlightMarkdown = (text: string) =>
  text
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return line
      }
      return `<mark>${escapeHtml(line)}</mark>`
    })
    .join('\n')

const buildMarkdownWithLineMarksByRange = (
  content: string,
  range: HighlightRange | null,
) => {
  if (!range) {
    return content
  }
  const focusText = content.slice(range.start, range.end)
  if (!focusText) {
    return content
  }
  return `${content.slice(0, range.start)}${toLineMarkedHighlightMarkdown(focusText)}${content.slice(range.end)}`
}

interface SourcesPanelProps {
  collapsed: boolean
  isBusy: boolean
  isHydrating: boolean
  loadingSkeletonCount: number
  sourceListItems: SourceListItem[]
  removingMap: Record<string, boolean>
  allSourcesChecked: boolean
  someSourcesChecked: boolean
  onCollapse: () => void
  onCreateFile: (files: File[]) => Promise<void>
  onCreateUrl: (url: string) => Promise<void>
  onCreateText: (text: string) => Promise<void>
  onToggleAll: (checked: boolean) => void
  onToggleItem: (id: string, checked: boolean) => void
  onDeleteItem: (id: string) => Promise<void>
  onRetryItem: (id: string) => Promise<void>
  onRenameItem: (id: string, title: string) => Promise<void>
  checkedMap: Record<string, boolean>
  previewRequest?: SourcePreviewRequest | null
}

export function SourcesPanel({
  collapsed,
  isBusy,
  isHydrating,
  loadingSkeletonCount,
  sourceListItems,
  removingMap,
  allSourcesChecked,
  someSourcesChecked,
  onCollapse,
  onCreateFile,
  onCreateUrl,
  onCreateText,
  onToggleAll,
  onToggleItem,
  onDeleteItem,
  onRetryItem,
  onRenameItem,
  checkedMap,
  previewRequest,
}: SourcesPanelProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewState, setPreviewState] = useState<SourcePreviewState | null>(null)
  const [treeState, setTreeState] = useState<SourceTreeState | null>(null)
  const previewRequestSeqRef = useRef(0)
  const treeRequestSeqRef = useRef(0)
  const handledPreviewRequestIdRef = useRef<number>(0)
  const previewBodyRef = useRef<HTMLDivElement | null>(null)
  const previewInitialFocusPendingRef = useRef(false)
  const skeletonItemCount = Math.max(loadingSkeletonCount, 0)
  const showListLoadingSkeleton =
    isHydrating && sourceListItems.length === 0 && skeletonItemCount > 0

  const closeSourcePreview = () => {
    previewRequestSeqRef.current += 1
    previewInitialFocusPendingRef.current = false
    setPreviewState(null)
  }

  const openSourcePreview = useCallback(async (
    item: SourceListItem,
    locator: ChatCitationJumpRequest | null = null,
  ) => {
    const requestSeq = previewRequestSeqRef.current + 1
    previewRequestSeqRef.current = requestSeq
    previewInitialFocusPendingRef.current = true

    const sourceId = item.id
    const sourceName = item.name
    setPreviewState({
      sourceId,
      sourceName,
      loading: true,
      rawMarkdown: '',
      markdown: '',
      highlightSnippet: locator?.snippet?.trim() ?? '',
      focusRange: null,
      notice: '',
      error: '',
      locator,
    })

    try {
      const parsedContent = await queryClient.fetchQuery(
        buildSourceParsedContentQueryOptions(sourceId),
      )
      if (previewRequestSeqRef.current !== requestSeq) {
        return
      }

      if (!parsedContent) {
        setPreviewState({
          sourceId,
          sourceName,
          loading: false,
          rawMarkdown: '',
          markdown: '',
          highlightSnippet: locator?.snippet?.trim() ?? '',
          focusRange: null,
          notice: sourcePreviewEmptyNotice,
          error: '',
          locator,
        })
        return
      }

      let markdown = parsedContent.content?.trim() ?? ''
      if (!markdown && parsedContent.url) {
        markdown = await queryClient.fetchQuery(
          buildSourceParsedContentUrlQueryOptions(parsedContent.url),
        )
        markdown = markdown.trim()
        if (previewRequestSeqRef.current !== requestSeq) {
          return
        }
      }

      if (!markdown) {
        setPreviewState({
          sourceId,
          sourceName,
          loading: false,
          rawMarkdown: '',
          markdown: '',
          highlightSnippet: locator?.snippet?.trim() ?? '',
          focusRange: null,
          notice: sourcePreviewEmptyNotice,
          error: '',
          locator,
        })
        return
      }

      let focusRange: HighlightRange | null = null
      focusRange = resolveHighlightRangeByRunePosition(markdown, locator?.position)
      if (!focusRange) {
        focusRange = resolveHighlightRangeBySnippet(markdown, locator?.snippet)
      }
      const focusRangeRange = expandHighlightRangeToLineBoundaries(markdown, focusRange)
      setPreviewState({
        sourceId,
        sourceName,
        loading: false,
        rawMarkdown: markdown,
        markdown,
        highlightSnippet: locator?.snippet?.trim() ?? '',
        focusRange: focusRangeRange,
        notice: '',
        error: '',
        locator,
      })
    } catch (error) {
      if (previewRequestSeqRef.current !== requestSeq) {
        return
      }
      setPreviewState({
        sourceId,
        sourceName,
        loading: false,
        rawMarkdown: '',
        markdown: '',
        highlightSnippet: locator?.snippet?.trim() ?? '',
        focusRange: null,
        notice: '',
        error: getSourcePreviewErrorMessage(error),
        locator,
      })
    }
  }, [queryClient])

  const closeSourceTree = () => {
    treeRequestSeqRef.current += 1
    setTreeState(null)
  }

  const loadSourceTree = async (sourceId: string, sourceName: string) => {
    const requestSeq = treeRequestSeqRef.current + 1
    treeRequestSeqRef.current = requestSeq

    setTreeState({
      sourceId,
      sourceName,
      loading: true,
      tree: null,
      error: '',
    })

    try {
      const tree = await getSourceParsedTree(sourceId)
      if (treeRequestSeqRef.current !== requestSeq) {
        return
      }
      setTreeState({
        sourceId,
        sourceName,
        loading: false,
        tree,
        error: '',
      })
    } catch (error) {
      if (treeRequestSeqRef.current !== requestSeq) {
        return
      }
      setTreeState({
        sourceId,
        sourceName,
        loading: false,
        tree: null,
        error: getSourcePreviewErrorMessage(error),
      })
    }
  }

  const openSourceTree = async (item: SourceListItem) => {
    await loadSourceTree(item.id, item.name)
  }

  const retryOpenSourceTree = () => {
    if (!treeState) {
      return
    }
    void loadSourceTree(treeState.sourceId, treeState.sourceName)
  }

  useEffect(() => {
    if (!previewRequest) {
      return
    }
    if (handledPreviewRequestIdRef.current === previewRequest.requestId) {
      return
    }
    const targetSource = sourceListItems.find((item) => item.id === previewRequest.sourceId)
    if (!targetSource) {
      return
    }
    handledPreviewRequestIdRef.current = previewRequest.requestId
    const timer = window.setTimeout(() => {
      void openSourcePreview(targetSource, previewRequest)
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [openSourcePreview, previewRequest, sourceListItems])

  useEffect(() => {
    if (!previewState || previewState.loading || previewState.error || previewState.notice) {
      return
    }
    if (!previewInitialFocusPendingRef.current) {
      return
    }
    if (!previewState.locator?.position && !previewState.focusRange && !previewState.highlightSnippet) {
      previewInitialFocusPendingRef.current = false
      return
    }
    const container = previewBodyRef.current
    if (!container) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const scrollElementToVerticalCenter = (element: HTMLElement) => {
        const containerRect = container.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        const deltaTop = elementRect.top - containerRect.top
        const targetTop = container.scrollTop + deltaTop - container.clientHeight / 2 + elementRect.height / 2
        const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0)
        container.scrollTop = Math.min(Math.max(Math.round(targetTop), 0), maxScrollTop)
        container.scrollLeft = 0
      }

      const rangeHighlightBlock = container.querySelector('[data-citation-range-highlight="true"]')
      if (rangeHighlightBlock instanceof HTMLElement) {
        scrollElementToVerticalCenter(rangeHighlightBlock)
        previewInitialFocusPendingRef.current = false
        return
      }
      const highlight = container.querySelector('mark')
      if (highlight instanceof HTMLElement) {
        scrollElementToVerticalCenter(highlight)
        previewInitialFocusPendingRef.current = false
        return
      }

      const start = previewState.locator?.position?.start
      if (typeof start !== 'number' || !Number.isFinite(start)) {
        return
      }
      const maxScrollTop = container.scrollHeight - container.clientHeight
      if (maxScrollTop <= 0) {
        return
      }
      const totalRunes = Math.max(Array.from(previewState.rawMarkdown).length, 1)
      const ratio = Math.min(Math.max(start / totalRunes, 0), 1)
      container.scrollTop = Math.round(maxScrollTop * ratio)
      container.scrollLeft = 0
      previewInitialFocusPendingRef.current = false
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [previewState])

  return (
    <>
      <AddSourceDialog
        open={dialogOpen}
        isBusy={isBusy}
        onClose={() => setDialogOpen(false)}
        onCreateFile={onCreateFile}
        onCreateUrl={onCreateUrl}
        onCreateText={onCreateText}
      />
      {treeState ? (
        <SourceParsedTreeOverlay
          key={treeState.sourceId}
          open
          sourceName={treeState.sourceName}
          loading={treeState.loading}
          error={treeState.error}
          tree={treeState.tree}
          onClose={closeSourceTree}
          onRetry={retryOpenSourceTree}
        />
      ) : null}
      <Box
        sx={{
          width: { xs: '100%', md: collapsed ? 0 : '100%' },
          height: '100%',
          minWidth: 0,
          overflow: 'hidden',
          transition: 'width 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition:
              'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
            pointerEvents: collapsed ? 'none' : 'auto',
          }}
        >
          <PanelSubpageLayout
            primaryContent={(
              <Stack sx={{ height: '100%', minHeight: 0 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant={panelTitleVariant} sx={panelTitleSx}>
                    来源
                  </Typography>
                  <IconButton
                    size="small"
                    color="default"
                    aria-label="收起来源面板"
                    onClick={onCollapse}
                  >
                    <KeyboardDoubleArrowLeftIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setDialogOpen(true)}
                    disabled={isBusy}
                    sx={{ borderStyle: 'dashed', textTransform: 'none', justifyContent: 'center' }}
                  >
                    + 添加来源
                  </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: 'center', pr: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                    所有来源
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={allSourcesChecked}
                      indeterminate={someSourcesChecked}
                      disableRipple
                      icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 16 }} />}
                      checkedIcon={<CheckBoxIcon sx={{ fontSize: 16 }} />}
                      indeterminateIcon={<IndeterminateCheckBoxIcon sx={{ fontSize: 16 }} />}
                      sx={{ p: 0, m: 0 }}
                      onChange={(e) => onToggleAll(e.target.checked)}
                    />
                  </Box>
                </Stack>

                <Stack
                  spacing={0}
                  sx={{ mt: 1.25, flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, ...subtleScrollbarSx }}
                >
                  {showListLoadingSkeleton
                    ? Array.from({ length: skeletonItemCount }).map((_, index) => (
                        <Box
                          key={`source-skeleton-${index}`}
                          sx={{ py: 1 }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ minWidth: 0, alignItems: 'center' }}
                          >
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ minWidth: 0, alignItems: 'center', flex: 1 }}
                            >
                              <Box
                                sx={{
                                  width: 18,
                                  height: 18,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Skeleton variant="rounded" width={18} height={18} />
                              </Box>
                              <Skeleton
                                variant="rounded"
                                width={sourceSkeletonNameWidthPattern[index % sourceSkeletonNameWidthPattern.length]}
                                height={14}
                                sx={{ flexShrink: 0 }}
                              />
                            </Stack>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Skeleton variant="rounded" width={16} height={16} />
                            </Box>
                          </Stack>
                        </Box>
                      ))
                    : sourceListItems.length > 0
                      ? sourceListItems.map((item) => (
                          <SourceListRow
                            key={item.id}
                            item={item}
                            checked={Boolean(checkedMap[item.id])}
                            removing={Boolean(removingMap[item.id])}
                            isBusy={isBusy}
                            onToggleItem={onToggleItem}
                            onDeleteItem={onDeleteItem}
                            onRetryItem={onRetryItem}
                            onRenameItem={onRenameItem}
                            onPreviewItem={openSourcePreview}
                            onShowTree={openSourceTree}
                            previewLoading={Boolean(previewState?.loading && previewState.sourceId === item.id)}
                            treeLoading={Boolean(treeState?.loading && treeState.sourceId === item.id)}
                          />
                        ))
                      : null}
                </Stack>
              </Stack>
            )}
            subpage={previewState
              ? {
                  parentTitle: '来源',
                  title: `预览 · ${previewState.sourceName}`,
                  content: previewState.loading ? (
                    <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }} spacing={1}>
                      <CircularProgress size={22} />
                      <Typography variant="body2" color="text.secondary">
                        {sourcePreviewLoadingText}
                      </Typography>
                    </Stack>
                  ) : previewState.error ? (
                    <Alert severity="error">{previewState.error}</Alert>
                  ) : previewState.notice ? (
                    <Alert severity="info">{previewState.notice}</Alert>
                  ) : previewState.focusRange ? (
                    <Box sx={{ minWidth: 0 }}>
                      <MarkdownRenderer
                        content={buildMarkdownWithLineMarksByRange(
                          previewState.markdown,
                          previewState.focusRange,
                        )}
                      />
                    </Box>
                  ) : (
                    <Stack spacing={0.55} sx={{ minWidth: 0 }}>
                      {previewState.highlightSnippet ? (
                        <Box
                          data-citation-range-highlight="true"
                          sx={{
                            px: 0.7,
                            py: 0.55,
                            borderRadius: 0.7,
                            bgcolor: '#FFF59D',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 500 }}
                          >
                            {previewState.highlightSnippet}
                          </Typography>
                        </Box>
                      ) : null}
                      <Box sx={{ minWidth: 0 }}>
                        <MarkdownRenderer content={previewState.markdown} />
                      </Box>
                    </Stack>
                  ),
                  onClose: closeSourcePreview,
                  closeAriaLabel: '关闭预览',
                }
              : null}
            subpageBodyRef={previewBodyRef}
            subpageBodySx={{ pr: 0.5, overflowX: 'hidden', ...subtleScrollbarSx }}
          />
        </Paper>
      </Box>
    </>
  )
}
