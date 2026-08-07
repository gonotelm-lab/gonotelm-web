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
import { workspaceLayout, workspaceSpace } from '../../shared/ui/layoutTokens'
import { panelTitleSx, panelTitleToBodySpacing, panelTitleVariant } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import type { SourceListItem } from './types/sourceTypes'
import { useSourcePreviewController, type SourcePreviewRequest, type SourcePreviewState } from './preview/useSourcePreviewController'
import { workspaceIconSize, workspaceType } from '../../shared/ui/typeTokens'
import {
  sourceListRowHeightPx,
  sourceSelectionColumnWidthPx,
  sourceTypeIconBoxPx,
} from './sourceListLayout'

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
  /** Heavy markdown: freeze content width during panel resize (keep mounted). */
  degradedByResizing: boolean
  closeInlinePreview: () => void
  openOverlayFromInline: () => void
  downloadActivePreview: () => void
  retryActivePreview: () => void
  showListLoadingSkeleton: boolean
  skeletonItemCount: number
  openPreviewFromMenu: (item: SourceListItem) => void
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
          // 列宽由外层 grid CSS 变量驱动；这里再动 width/transform 会叠加重排导致卡顿
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          pointerEvents: collapsed ? 'none' : 'auto',
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            px: { xs: workspaceSpace.lg, md: workspaceLayout.panelPaddingX },
            py: workspaceLayout.panelPaddingY,
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            position: 'relative',
          }}
        >
          <PanelSubpageLayout
            primaryContent={(
              <Stack
                sx={{
                  flex: 1,
                  height: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant={panelTitleVariant} sx={panelTitleSx}>
                    来源
                  </Typography>
                  <IconButton
                    size="small"
                    color="default"
                    aria-label="收起来源面板"
                    onClick={onCollapse}
                    sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                  >
                    <KeyboardDoubleArrowLeftIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack
                  spacing={workspaceSpace.md}
                  sx={{ mt: panelTitleToBodySpacing, flexShrink: 0 }}
                >
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

                <Divider sx={{ my: workspaceLayout.panelPaddingY, flexShrink: 0 }} />

                {/*
                  「所有来源」必须与列表同处一个 overflow 容器：F12 贴底后视口变矮会出滚动条，
                  若表头在滚动区外，列表勾选列会被滚动条占宽顶偏，出现错位。
                */}
                <Box
                  sx={(theme) => ({
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    ...subtleScrollbarSx(theme),
                  })}
                >
                  <Box>
                    <Box
                      sx={{
                        position: 'sticky',
                        top: 0,
                        // 必须高于行内 Stack 的 zIndex(1)，否则滚动时行内容会压到表头上方。
                        zIndex: 2,
                        boxSizing: 'border-box',
                        height: sourceListRowHeightPx,
                        minWidth: 0,
                        px: workspaceSpace.xxs,
                        display: 'flex',
                        alignItems: 'center',
                        columnGap: workspaceLayout.listInlineGap,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          m: 0,
                          fontSize: workspaceType.sm,
                          lineHeight: 1.25,
                        }}
                      >
                        所有来源
                      </Typography>
                      <Box
                        sx={{
                          width: sourceSelectionColumnWidthPx,
                          minWidth: sourceSelectionColumnWidthPx,
                          height: '100%',
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
                          icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: workspaceIconSize.md }} />}
                          checkedIcon={<CheckBoxIcon sx={{ fontSize: workspaceIconSize.md }} />}
                          indeterminateIcon={<IndeterminateCheckBoxIcon sx={{ fontSize: workspaceIconSize.md }} />}
                          sx={{ p: 0, m: 0 }}
                          onChange={(e) => onToggleAll(e.target.checked)}
                        />
                      </Box>
                    </Box>

                    {showListLoadingSkeleton
                      ? Array.from({ length: skeletonItemCount }).map((_, index) => (
                          <Box
                            key={`source-skeleton-${index}`}
                            sx={{
                              boxSizing: 'border-box',
                              height: sourceListRowHeightPx,
                              px: workspaceSpace.xxs,
                              display: 'flex',
                              alignItems: 'center',
                              columnGap: workspaceLayout.listInlineGap,
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={workspaceLayout.listInlineGap}
                              sx={{ minWidth: 0, alignItems: 'center', flex: 1 }}
                            >
                              <Box
                                sx={{
                                  width: sourceTypeIconBoxPx,
                                  height: sourceTypeIconBoxPx,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Skeleton
                                  variant="rounded"
                                  width={sourceTypeIconBoxPx}
                                  height={sourceTypeIconBoxPx}
                                />
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
                                width: sourceSelectionColumnWidthPx,
                                minWidth: sourceSelectionColumnWidthPx,
                                height: '100%',
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Skeleton variant="rounded" width={16} height={16} />
                            </Box>
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
                              selectionColumnWidth={sourceSelectionColumnWidthPx}
                              previewLoading={Boolean(
                                previewState.loading &&
                                previewState.sourceId === item.id,
                              )}
                            />
                          ))
                        : null}
                  </Box>
                </Box>
              </Stack>
            )}
            subpage={previewState.inlineOpen
              ? {
                  parentTitle: '来源',
                  title: '预览',
                  content: (
                    <SourceInlinePreview
                      sourceName={previewState.sourceName}
                      viewType={previewState.viewType}
                      loading={previewState.loading}
                      error={previewState.error}
                      notice={previewState.notice}
                      markdown={previewState.markdown}
                      focusRange={previewState.focusRange}
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
            subpageBodySx={{
              pr: workspaceSpace.xxs,
              // Scroll lives in SourceInlinePreview (shared subtle scrollbar).
              overflow: 'hidden',
            }}
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
        focusRange={previewState.focusRange}
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
  const resolveCitationScrollContainer = (container: HTMLElement) => {
    const nestedScrollable = container.querySelector('[data-source-preview-scroll-root="true"]')
    if (nestedScrollable instanceof HTMLElement) {
      return nestedScrollable
    }
    return container
  }

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
    if (!previewState.locator?.position && !previewState.focusRange) {
      previewInitialFocusPendingRef.current = false
      return
    }
    const container = previewBodyRef.current
    if (!container) {
      return
    }
    const scrollContainer = resolveCitationScrollContainer(container)

    const frameId = window.requestAnimationFrame(() => {
      const scrollElementToVerticalCenter = (element: HTMLElement) => {
        const containerRect = scrollContainer.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        const deltaTop = elementRect.top - containerRect.top
        const targetTop = scrollContainer.scrollTop +
          deltaTop -
          scrollContainer.clientHeight / 2 +
          elementRect.height / 2
        const maxScrollTop = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 0)
        scrollContainer.scrollTop = Math.min(Math.max(Math.round(targetTop), 0), maxScrollTop)
        scrollContainer.scrollLeft = 0
      }

      const highlight = scrollContainer.querySelector('mark')
      if (highlight instanceof HTMLElement) {
        scrollElementToVerticalCenter(highlight)
        previewInitialFocusPendingRef.current = false
        return
      }

      const start = previewState.locator?.position?.start
      if (typeof start !== 'number' || !Number.isFinite(start)) {
        return
      }
      const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight
      if (maxScrollTop <= 0) {
        return
      }
      const totalRunes = Math.max(Array.from(previewState.rawMarkdown).length, 1)
      const ratio = Math.min(Math.max(start / totalRunes, 0), 1)
      scrollContainer.scrollTop = Math.round(maxScrollTop * ratio)
      scrollContainer.scrollLeft = 0
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
    openPreviewFromCitation,
    closeInlinePreview,
    closeOverlayPreview,
    retryActivePreview,
    openOverlayFromInline,
    downloadActivePreview,
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

  return (
    <SourcesPanelLayout
      panelProps={props}
      dialogOpen={dialogOpen}
      onDialogOpen={() => setDialogOpen(true)}
      onDialogClose={() => setDialogOpen(false)}
      previewState={previewState}
      canOpenOverlay={canOpenOverlay}
      canDownload={canDownload}
      degradedByResizing={false}
      closeInlinePreview={handleCloseInlinePreview}
      openOverlayFromInline={openOverlayFromInline}
      downloadActivePreview={downloadActivePreview}
      retryActivePreview={retryActivePreview}
      showListLoadingSkeleton={showListLoadingSkeleton}
      skeletonItemCount={skeletonItemCount}
      openPreviewFromMenu={handleOpenPreviewFromMenu}
      previewBodyRef={previewBodyRef}
      closeOverlayPreview={closeOverlayPreview}
    />
  )
}
