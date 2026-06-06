import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { AddSourceDialog } from './components/AddSourceDialog'
import { SourceInlinePreview } from './components/SourceInlinePreview'
import { SourceListRow } from './components/SourceListRow'
import { SourcePreviewOverlay } from './components/SourcePreviewOverlay'
import { PanelSubpageLayout } from '../../shared/ui/PanelSubpageLayout'
import { panelTitleSx, panelTitleToBodySpacing, panelTitleVariant } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import type { SourceListItem } from './types/sourceTypes'
import { useSourcePreviewController, type SourcePreviewRequest, type SourcePreviewState } from './preview/useSourcePreviewController'

const sourceSkeletonNameWidthPattern = ['62%', '78%', '69%', '84%', '58%', '73%'] as const

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
  isPanelResizing?: boolean
}

interface SourcesPanelLayoutProps {
  panelProps: SourcesPanelProps
  dialogOpen: boolean
  onDialogOpen: () => void
  onDialogClose: () => void
  previewState: SourcePreviewState
  canOpenOverlay: boolean
  canDownload: boolean
  degradedByResizing: boolean
  closeInlinePreview: () => void
  openOverlayFromInline: () => void
  downloadActivePreview: () => void
  retryActivePreview: () => void
  showListLoadingSkeleton: boolean
  skeletonItemCount: number
  openPreviewFromMenu: (item: SourceListItem) => void
  openTreeFromMenu: (item: SourceListItem) => void
  previewBodyRef: RefObject<HTMLDivElement | null>
  closeOverlayPreview: () => void
}

function SourcesPanelLayout({
  panelProps,
  dialogOpen,
  onDialogOpen,
  onDialogClose,
  previewState,
  canOpenOverlay,
  canDownload,
  degradedByResizing,
  closeInlinePreview,
  openOverlayFromInline,
  downloadActivePreview,
  retryActivePreview,
  showListLoadingSkeleton,
  skeletonItemCount,
  openPreviewFromMenu,
  openTreeFromMenu,
  previewBodyRef,
  closeOverlayPreview,
}: SourcesPanelLayoutProps) {
  const {
    collapsed,
    isBusy,
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
  } = panelProps

  return (
    <>
      <AddSourceDialog
        open={dialogOpen}
        isBusy={isBusy}
        onClose={onDialogClose}
        onCreateFile={onCreateFile}
        onCreateUrl={onCreateUrl}
        onCreateText={onCreateText}
      />
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

                <Stack spacing={1.25} sx={{ mt: panelTitleToBodySpacing }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={onDialogOpen}
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
                            onPreviewItem={openPreviewFromMenu}
                            onShowTree={openTreeFromMenu}
                            previewLoading={Boolean(
                              previewState.loading &&
                              previewState.sourceId === item.id &&
                              previewState.viewType === 'content',
                            )}
                            treeLoading={Boolean(
                              previewState.loading &&
                              previewState.sourceId === item.id &&
                              previewState.viewType === 'tree',
                            )}
                          />
                        ))
                      : null}
                </Stack>
              </Stack>
            )}
            subpage={previewState.inlineOpen
              ? {
                  parentTitle: '来源',
                  title: previewState.sourceName,
                  content: (
                    <SourceInlinePreview
                      sourceName={previewState.sourceName}
                      viewType={previewState.viewType}
                      loading={previewState.loading}
                      error={previewState.error}
                      notice={previewState.notice}
                      markdown={previewState.markdown}
                      highlightSnippet={previewState.highlightSnippet}
                      focusRange={previewState.focusRange}
                      tree={previewState.tree}
                      canOpenOverlay={canOpenOverlay}
                      canDownload={canDownload}
                      onOpenOverlay={openOverlayFromInline}
                      onDownload={downloadActivePreview}
                      onRetryLoad={retryActivePreview}
                      degradedByResizing={degradedByResizing}
                    />
                  ),
                  onClose: closeInlinePreview,
                  closeAriaLabel: '关闭预览',
                }
              : null}
            subpageBodyRef={previewBodyRef}
            subpageBodySx={{ pr: 0.5, overflowX: 'hidden', ...subtleScrollbarSx }}
          />
        </Paper>
      </Box>
      <SourcePreviewOverlay
        open={previewState.overlayOpen}
        sourceName={previewState.sourceName}
        viewType={previewState.viewType}
        loading={previewState.loading}
        error={previewState.error}
        notice={previewState.notice}
        markdown={previewState.markdown}
        highlightSnippet={previewState.highlightSnippet}
        focusRange={previewState.focusRange}
        tree={previewState.tree}
        canDownload={canDownload}
        onDownload={downloadActivePreview}
        onClose={closeOverlayPreview}
        onRetryLoad={retryActivePreview}
      />
    </>
  )
}

const usePreviewInitialFocus = ({
  previewState,
  previewBodyRef,
  previewInitialFocusPendingRef,
}: {
  previewState: SourcePreviewState
  previewBodyRef: RefObject<HTMLDivElement | null>
  previewInitialFocusPendingRef: MutableRefObject<boolean>
}) => {
  useEffect(() => {
    if (
      !previewState.inlineOpen ||
      previewState.viewType !== 'content' ||
      previewState.loading ||
      previewState.error ||
      previewState.notice
    ) {
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
  }, [previewBodyRef, previewInitialFocusPendingRef, previewState])
}

export function SourcesPanel(props: SourcesPanelProps) {
  const {
    isHydrating,
    loadingSkeletonCount,
    sourceListItems,
    previewRequest,
    isPanelResizing = false,
  } = props
  const [dialogOpen, setDialogOpen] = useState(false)
  const handledPreviewRequestIdRef = useRef<number>(0)
  const previewBodyRef = useRef<HTMLDivElement | null>(null)
  const previewInitialFocusPendingRef = useRef(false)
  const skeletonItemCount = Math.max(loadingSkeletonCount, 0)
  const showListLoadingSkeleton =
    isHydrating && sourceListItems.length === 0 && skeletonItemCount > 0
  const {
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
  } = useSourcePreviewController({
    sourceListItems,
  })

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
    previewInitialFocusPendingRef.current = true
    const timer = window.setTimeout(() => {
      openPreviewFromCitation(targetSource, previewRequest)
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [openPreviewFromCitation, previewRequest, sourceListItems])

  usePreviewInitialFocus({
    previewState,
    previewBodyRef,
    previewInitialFocusPendingRef,
  })

  const canOpenOverlay = activeCapability.overlay
  const canDownload = activeCapability.downloadable &&
    previewState.viewType === 'content' &&
    Boolean(previewState.rawMarkdown.trim() || previewState.markdown.trim())
  const handleCloseInlinePreview = () => {
    previewInitialFocusPendingRef.current = false
    closeInlinePreview()
  }
  const handleOpenPreviewFromMenu = (item: SourceListItem) => {
    previewInitialFocusPendingRef.current = false
    openPreviewFromMenu(item)
  }
  const handleOpenTreeFromMenu = (item: SourceListItem) => {
    previewInitialFocusPendingRef.current = false
    openTreeFromMenu(item)
  }

  return (
    <SourcesPanelLayout
      panelProps={props}
      dialogOpen={dialogOpen}
      onDialogOpen={() => setDialogOpen(true)}
      onDialogClose={() => setDialogOpen(false)}
      previewState={previewState}
      canOpenOverlay={canOpenOverlay}
      canDownload={canDownload}
      degradedByResizing={isPanelResizing && isHeavyPreview}
      closeInlinePreview={handleCloseInlinePreview}
      openOverlayFromInline={openOverlayFromInline}
      downloadActivePreview={downloadActivePreview}
      retryActivePreview={retryActivePreview}
      showListLoadingSkeleton={showListLoadingSkeleton}
      skeletonItemCount={skeletonItemCount}
      openPreviewFromMenu={handleOpenPreviewFromMenu}
      openTreeFromMenu={handleOpenTreeFromMenu}
      previewBodyRef={previewBodyRef}
      closeOverlayPreview={closeOverlayPreview}
    />
  )
}
