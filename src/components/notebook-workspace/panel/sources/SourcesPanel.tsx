import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react'
import { useTranslation } from 'react-i18next'
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
import { hiddenScrollbarSx } from '../../shared/ui/scrollbar'
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
  /** 无编辑权限时隐藏添加来源与所有写操作，只保留预览 / 下载 / 勾选。 */
  canManageContent?: boolean
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
  const { t } = useTranslation(['sources', 'common'])
  const {
    collapsed,
    isBusy,
    canManageContent = true,
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
      {/*
        对话框常驻挂载，只由 open 控制显隐：
        —— 不再在布局层再判一次 canManageContent，避免「按钮可见但点击后因第二份
        权限判断不一致而不弹窗」。权限只决定按钮是否渲染，以及这里 open 的最终值。
      */}
      <AddSourceDialog
        open={canManageContent && dialogOpen}
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
                    {t('sources:panel.title')}
                  </Typography>
                  <IconButton
                    size="small"
                    color="default"
                    aria-label={t('sources:panel.collapseAria')}
                    onClick={onCollapse}
                    sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                  >
                    <KeyboardDoubleArrowLeftIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {canManageContent ? (
                  <Stack
                    spacing={workspaceSpace.md}
                    sx={{ mt: panelTitleToBodySpacing, flexShrink: 0 }}
                  >
                    <Button
                      data-testid="sources-add"
                      variant="outlined"
                      fullWidth
                      onClick={onDialogOpen}
                      disabled={isBusy}
                      sx={{ borderStyle: 'dashed', textTransform: 'none', justifyContent: 'center' }}
                    >
                      {t('sources:panel.add')}
                    </Button>
                  </Stack>
                ) : null}

                <Divider sx={{ my: workspaceLayout.panelPaddingY, flexShrink: 0 }} />

                {/*
                  「所有来源」与列表同处 overflow 容器，保证勾选列与表头对齐；
                  隐藏滚动条以免占宽把复选框顶离右缘。
                */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    ...hiddenScrollbarSx(),
                  }}
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
                        pl: workspaceSpace.xxs,
                        pr: 0,
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
                        {t('sources:panel.all')}
                      </Typography>
                      <Box
                        sx={{
                          width: sourceSelectionColumnWidthPx,
                          minWidth: sourceSelectionColumnWidthPx,
                          height: '100%',
                          display: 'inline-flex',
                          justifyContent: 'flex-end',
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
                              pl: workspaceSpace.xxs,
                              pr: 0,
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
                                justifyContent: 'flex-end',
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
                            <Box
                              key={item.id}
                              sx={{
                                contentVisibility: 'auto',
                                containIntrinsicSize: `0 ${sourceListRowHeightPx}px`,
                              }}
                            >
                              <SourceListRow
                                item={item}
                                checked={Boolean(checkedMap[item.id])}
                                removing={Boolean(removingMap[item.id])}
                                isBusy={isBusy}
                                canManageContent={canManageContent}
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
                            </Box>
                          ))
                        : null}
                  </Box>
                </Box>
              </Stack>
            )}
            subpage={previewState.inlineOpen
              ? {
                  parentTitle: t('sources:preview.parentTitle'),
                  title: t('sources:preview.title'),
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
                  closeAriaLabel: t('sources:preview.closeAria'),
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
      // UTF-16 length is enough for scroll ratio; avoid allocating a full rune array.
      const totalRunes = Math.max(previewState.rawMarkdown.length, 1)
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

const isSourceRowSelectable = (item: SourceListItem, removing: boolean) =>
  !removing && item.status !== 'uploading' && item.status !== 'preparing'

export const SourcesPanel = memo(function SourcesPanel(props: SourcesPanelProps) {
  const {
    isHydrating,
    loadingSkeletonCount,
    sourceListItems,
    previewRequest,
    checkedMap,
    removingMap,
    onToggleItem,
    onToggleAll,
  } = props
  const [dialogOpen, setDialogOpen] = useState(false)
  // Local mirror so header "所有来源" and row checkboxes paint from one state.
  const [uiCheckedMap, setUiCheckedMap] = useState(checkedMap)
  const handledPreviewRequestIdRef = useRef<number>(0)
  const previewBodyRef = useRef<HTMLDivElement | null>(null)
  const previewInitialFocusPendingRef = useRef(false)
  // Cap skeleton rows so a large source_count does not mount dozens of placeholders.
  const skeletonItemCount = Math.min(Math.max(loadingSkeletonCount, 0), 8)
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
    setUiCheckedMap(checkedMap)
  }, [checkedMap])

  const selectableSourceItems = useMemo(
    () =>
      sourceListItems.filter((item) =>
        isSourceRowSelectable(item, Boolean(removingMap[item.id])),
      ),
    [removingMap, sourceListItems],
  )

  const allSourcesChecked =
    selectableSourceItems.length > 0
    && selectableSourceItems.every((item) => Boolean(uiCheckedMap[item.id]))

  const someSourcesChecked =
    !allSourcesChecked
    && selectableSourceItems.some((item) => Boolean(uiCheckedMap[item.id]))

  const handleToggleItem = useCallback(
    (id: string, checked: boolean) => {
      setUiCheckedMap((prev) => ({
        ...prev,
        [id]: checked,
      }))
      onToggleItem(id, checked)
    },
    [onToggleItem],
  )

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      setUiCheckedMap((prev) => {
        const next = { ...prev }
        selectableSourceItems.forEach((item) => {
          next[item.id] = checked
        })
        return next
      })
      onToggleAll(checked)
    },
    [onToggleAll, selectableSourceItems],
  )

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
  const handleCloseInlinePreview = useCallback(() => {
    previewInitialFocusPendingRef.current = false
    closeInlinePreview()
  }, [closeInlinePreview])

  const handleOpenPreviewFromMenu = useCallback((item: SourceListItem) => {
    previewInitialFocusPendingRef.current = false
    openPreviewFromMenu(item)
  }, [openPreviewFromMenu])

  const handleDialogOpen = useCallback(() => {
    // 按钮本身只在有编辑权限时渲染，这里不再重复判权限：
    // 避免权限状态在两处判断不一致时出现「能点但没反应」。
    setDialogOpen(true)
  }, [])

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false)
  }, [])

  const layoutPanelProps = useMemo(
    () => ({
      ...props,
      checkedMap: uiCheckedMap,
      allSourcesChecked,
      someSourcesChecked,
      onToggleItem: handleToggleItem,
      onToggleAll: handleToggleAll,
    }),
    [
      allSourcesChecked,
      handleToggleAll,
      handleToggleItem,
      props,
      someSourcesChecked,
      uiCheckedMap,
    ],
  )

  return (
    <SourcesPanelLayout
      panelProps={layoutPanelProps}
      dialogOpen={dialogOpen}
      onDialogOpen={handleDialogOpen}
      onDialogClose={handleDialogClose}
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
})
