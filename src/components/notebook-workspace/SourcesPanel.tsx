import { useState } from 'react'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { AddSourceDialog } from './AddSourceDialog'
import { SourceListRow } from './SourceListRow'
import type { SourceListItem } from './sourceTypes'

interface SourcesPanelProps {
  collapsed: boolean
  isBusy: boolean
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
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
            transition:
              'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
            pointerEvents: collapsed ? 'none' : 'auto',
          }}
        >
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
              onChange={(e) => onToggleAll(e.target.checked)}
            />
          </Box>
        </Stack>

        <Stack spacing={0} sx={{ mt: 1.25, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
          {sourceListItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无来源
            </Typography>
          ) : (
            sourceListItems.map((item) => (
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
          )}
        </Stack>
        </Paper>
      </Box>
    </>
  )
}
