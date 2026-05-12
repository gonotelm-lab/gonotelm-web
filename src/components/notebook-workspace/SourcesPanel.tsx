import { useState } from 'react'
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
import { AddSourceDialog } from './AddSourceDialog'
import { panelTitleSx, panelTitleVariant } from './panelStyles'
import { SourceListRow } from './SourceListRow'
import { subtleScrollbarSx } from './scrollbar'
import type { SourceListItem } from './sourceTypes'

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
  onPreviewItem: (id: string) => void
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
  onPreviewItem,
  checkedMap,
}: SourcesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const skeletonItemCount = Math.max(loadingSkeletonCount, 0)
  const showListLoadingSkeleton =
    isHydrating && sourceListItems.length === 0 && skeletonItemCount > 0

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
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition:
              'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
            pointerEvents: collapsed ? 'none' : 'auto',
          }}
        >
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

        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pr: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            所有来源
          </Typography>
          <Box sx={{ width: 36, display: 'flex', justifyContent: 'center' }}>
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
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
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
                    <Box sx={{ width: 36, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                    onPreviewItem={onPreviewItem}
                  />
                ))
              : null}
        </Stack>
        </Paper>
      </Box>
    </>
  )
}
