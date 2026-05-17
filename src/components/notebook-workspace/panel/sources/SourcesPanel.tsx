import { useRef, useState } from 'react'
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
import { getSourceParsedContent, loadParsedContentFromUrl } from '@/api/source'
import { ApiError } from '@/lib/http'
import { AddSourceDialog } from './components/AddSourceDialog'
import { SourceListRow } from './components/SourceListRow'
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

interface SourcePreviewState {
  sourceId: string
  sourceName: string
  loading: boolean
  markdown: string
  notice: string
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
}: SourcesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewState, setPreviewState] = useState<SourcePreviewState | null>(null)
  const previewRequestSeqRef = useRef(0)
  const skeletonItemCount = Math.max(loadingSkeletonCount, 0)
  const showListLoadingSkeleton =
    isHydrating && sourceListItems.length === 0 && skeletonItemCount > 0

  const closeSourcePreview = () => {
    previewRequestSeqRef.current += 1
    setPreviewState(null)
  }

  const openSourcePreview = async (item: SourceListItem) => {
    const requestSeq = previewRequestSeqRef.current + 1
    previewRequestSeqRef.current = requestSeq

    const sourceId = item.id
    const sourceName = item.name
    setPreviewState({
      sourceId,
      sourceName,
      loading: true,
      markdown: '',
      notice: '',
      error: '',
    })

    try {
      const parsedContent = await getSourceParsedContent(sourceId)
      if (previewRequestSeqRef.current !== requestSeq) {
        return
      }

      if (!parsedContent) {
        setPreviewState({
          sourceId,
          sourceName,
          loading: false,
          markdown: '',
          notice: sourcePreviewEmptyNotice,
          error: '',
        })
        return
      }

      let markdown = parsedContent.content?.trim() ?? ''
      if (!markdown && parsedContent.url) {
        markdown = (await loadParsedContentFromUrl(parsedContent.url)).trim()
        if (previewRequestSeqRef.current !== requestSeq) {
          return
        }
      }

      if (!markdown) {
        setPreviewState({
          sourceId,
          sourceName,
          loading: false,
          markdown: '',
          notice: sourcePreviewEmptyNotice,
          error: '',
        })
        return
      }

      setPreviewState({
        sourceId,
        sourceName,
        loading: false,
        markdown,
        notice: '',
        error: '',
      })
    } catch (error) {
      if (previewRequestSeqRef.current !== requestSeq) {
        return
      }
      setPreviewState({
        sourceId,
        sourceName,
        loading: false,
        markdown: '',
        notice: '',
        error: getSourcePreviewErrorMessage(error),
      })
    }
  }

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
                            previewLoading={Boolean(previewState?.loading && previewState.sourceId === item.id)}
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
                  ) : (
                    <MarkdownRenderer content={previewState.markdown} />
                  ),
                  onClose: closeSourcePreview,
                  closeAriaLabel: '关闭预览',
                }
              : null}
            subpageBodySx={{ pr: 0.5, ...subtleScrollbarSx }}
          />
        </Paper>
      </Box>
    </>
  )
}
