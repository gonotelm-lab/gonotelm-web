import { startTransition, useEffect, useState } from 'react'
import AddLinkIcon from '@mui/icons-material/AddLink'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import DownloadIcon from '@mui/icons-material/Download'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import NotesIcon from '@mui/icons-material/Notes'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import PreviewIcon from '@mui/icons-material/Preview'
import ReplayIcon from '@mui/icons-material/Replay'
import SchemaIcon from '@mui/icons-material/Schema'
import {
  Button,
  Box,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { FlowLoadingOverlay } from './FlowLoadingOverlay'
import { downloadSourceItemParsedContent } from './sourceItemDownload'
import type { SourceListItem } from '../types/sourceTypes'

const sourceTitleMaxChars = 64

interface SourceListRowProps {
  item: SourceListItem
  checked: boolean
  removing: boolean
  isBusy: boolean
  onToggleItem: (id: string, checked: boolean) => void
  onDeleteItem: (id: string) => Promise<void>
  onRetryItem: (id: string) => Promise<void>
  onRenameItem: (id: string, title: string) => Promise<void>
  onPreviewItem: (item: SourceListItem) => Promise<void> | void
  onShowTree: (item: SourceListItem) => Promise<void> | void
  previewLoading: boolean
  treeLoading: boolean
}

export function SourceListRow({
  item,
  checked,
  removing,
  isBusy,
  onToggleItem,
  onDeleteItem,
  onRetryItem,
  onRenameItem,
  onPreviewItem,
  onShowTree,
  previewLoading,
  treeLoading,
}: SourceListRowProps) {
  const isProcessing = item.status === 'uploading' || item.status === 'preparing'
  const isFailed = item.status === 'failed'
  const isReady = item.status === 'ready'
  const isAwaitingReady =
    item.status === 'inited' || item.status === 'uploading' || item.status === 'preparing'
  const rowSelectable = !isProcessing && !removing
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(item.title)
  const [titleErrorText, setTitleErrorText] = useState('')
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false)
  const [optimisticChecked, setOptimisticChecked] = useState(checked)

  useEffect(() => {
    setOptimisticChecked(checked)
  }, [checked])

  const actionMenuOpen = Boolean(actionAnchorEl)
  const actionMenuItemSx = {
    minHeight: 34,
    px: 1.25,
    display: 'flex',
    alignItems: 'center',
  }
  const actionMenuIconSx = { fontSize: 16, color: 'text.secondary' }
  const actionMenuTextSx = { fontSize: 12.5, lineHeight: 1.2, ml: 'auto', pl: 1.5 }

  const commitToggleSelection = (nextChecked: boolean) => {
    setOptimisticChecked(nextChecked)
    startTransition(() => {
      onToggleItem(item.id, nextChecked)
    })
  }

  const handleToggleRow = () => {
    if (editDialogOpen) return
    if (!rowSelectable) return
    commitToggleSelection(!optimisticChecked)
  }

  const openActionMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setActionAnchorEl(event.currentTarget)
  }

  const closeActionMenu = () => {
    setActionAnchorEl(null)
  }

  const handleDeleteSource = () => {
    closeActionMenu()
    void onDeleteItem(item.id)
  }

  const handleRetrySource = () => {
    closeActionMenu()
    void onRetryItem(item.id)
  }

  const handleDownloadSource = () => {
    closeActionMenu()
    if (!isReady || isBusy || removing) {
      return
    }
    void downloadSourceItemParsedContent(item.id).catch(() => undefined)
  }

  const handleOpenSourceUrl = () => {
    closeActionMenu()
    if (!item.urlContent) return
    window.open(item.urlContent, '_blank', 'noopener,noreferrer')
  }

  const handlePreviewSource = () => {
    closeActionMenu()
    void onPreviewItem(item)
  }

  const handleShowTree = () => {
    closeActionMenu()
    void onShowTree(item)
  }

  const handleOpenEditDialog = () => {
    closeActionMenu()
    if (removing || isUpdatingTitle) {
      return
    }
    setTitleDraft(item.title)
    setTitleErrorText('')
    setEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    if (isUpdatingTitle) {
      return
    }
    setTitleDraft(item.title)
    setTitleErrorText('')
    setEditDialogOpen(false)
  }

  const handleCommitEditTitle = () => {
    if (isUpdatingTitle) {
      return
    }

    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      setTitleErrorText('标题不能为空')
      return
    }

    if (nextTitle === item.title) {
      setEditDialogOpen(false)
      return
    }

    setIsUpdatingTitle(true)
    setTitleErrorText('')
    void onRenameItem(item.id, nextTitle)
      .then(() => {
        setEditDialogOpen(false)
      })
      .catch(() => {
        setTitleErrorText('更新标题失败，请稍后重试')
      })
      .finally(() => {
        setIsUpdatingTitle(false)
      })
  }

  const sourceTypeIcon =
    item.iconType === 'url' ? (
      <AddLinkIcon sx={{ color: '#0288D1', fontSize: 18 }} />
    ) : item.iconType === 'text' ? (
      <NotesIcon sx={{ color: '#2E7D32', fontSize: 18 }} />
    ) : item.iconType === 'pdf' ? (
      <PictureAsPdfIcon sx={{ color: '#E53935', fontSize: 18 }} />
    ) : item.iconType === 'epub' ? (
      <MenuBookIcon sx={{ color: '#8E24AA', fontSize: 18 }} />
    ) : item.iconType === 'txt' ? (
      <DescriptionIcon sx={{ color: '#26A69A', fontSize: 18 }} />
    ) : item.iconType === 'markdown' ? (
      <DescriptionIcon sx={{ color: '#7E57C2', fontSize: 18 }} />
    ) : (
      <DescriptionIcon sx={{ color: '#1E88E5', fontSize: 18 }} />
    )

  return (
    <Box
      onClick={handleToggleRow}
      sx={{
        py: removing ? 0 : 1,
        maxHeight: removing ? 0 : 58,
        opacity: removing ? 0 : 1,
        transform: removing ? 'translateX(-8px)' : 'translateX(0)',
        position: 'relative',
        overflow: 'hidden',
        transition: removing
          ? 'opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), transform 300ms cubic-bezier(0.22, 1, 0.36, 1), max-height 300ms cubic-bezier(0.22, 1, 0.36, 1), padding 300ms cubic-bezier(0.22, 1, 0.36, 1)'
          : 'none',
        pointerEvents: removing ? 'none' : 'auto',
        '&:hover .source-type-icon, &:focus-within .source-type-icon': {
          opacity: { xs: 1, md: 0 },
        },
        '&:hover .source-action-trigger, &:focus-within .source-action-trigger': {
          opacity: 1,
          pointerEvents: 'auto',
        },
      }}
    >
      <FlowLoadingOverlay active={isAwaitingReady && !removing} />

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ minWidth: 0, alignItems: 'center', position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: 'center', flex: 1 }}>
          <Box sx={{ position: 'relative', width: 18, height: 18 }}>
            <Box
              className="source-type-icon"
              sx={{
                width: '100%',
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 1,
                transition: 'opacity 160ms ease',
              }}
            >
              {sourceTypeIcon}
            </Box>
            <IconButton
              className="source-action-trigger"
              size="small"
              aria-label="来源操作"
              onClick={openActionMenu}
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: { xs: 1, md: 0 },
                pointerEvents: { xs: 'auto', md: 'none' },
                p: 0,
                transition: 'opacity 160ms ease',
              }}
            >
              <MoreHorizIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Typography
            variant="body2"
            noWrap
            sx={{ fontSize: 13.5 }}
          >
            {item.name}
          </Typography>
        </Stack>
        <Box sx={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
          {isProcessing ? (
            <CircularProgress size={16} thickness={5} />
          ) : (
            <Checkbox
              size="small"
              checked={optimisticChecked}
              disableRipple
              icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 16 }} />}
              checkedIcon={<CheckBoxIcon sx={{ fontSize: 16 }} />}
              sx={{ p: 0, m: 0 }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => commitToggleSelection(e.target.checked)}
            />
          )}
        </Box>
      </Stack>

      <Menu
        anchorEl={actionAnchorEl}
        open={actionMenuOpen}
        onClose={closeActionMenu}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          disabled={!isReady || isBusy || removing || previewLoading}
          onClick={handlePreviewSource}
          sx={actionMenuItemSx}
        >
          <PreviewIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>预览</Typography>
        </MenuItem>
        <MenuItem
          disabled={!isReady || isBusy || removing || treeLoading}
          onClick={handleShowTree}
          sx={actionMenuItemSx}
        >
          <SchemaIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>展示</Typography>
        </MenuItem>
        {item.kind === 'url' ? (
          <MenuItem
            disabled={!item.urlContent}
            onClick={handleOpenSourceUrl}
            sx={actionMenuItemSx}
          >
            <OpenInNewIcon sx={actionMenuIconSx} />
            <Typography sx={actionMenuTextSx}>打开链接</Typography>
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={!isReady || isBusy || removing}
          onClick={handleDownloadSource}
          sx={actionMenuItemSx}
        >
          <DownloadIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>下载</Typography>
        </MenuItem>
        {isFailed ? (
          <MenuItem
            disabled={isBusy || removing}
            onClick={handleRetrySource}
            sx={actionMenuItemSx}
          >
            <ReplayIcon sx={actionMenuIconSx} />
            <Typography sx={actionMenuTextSx}>重试</Typography>
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={removing || isUpdatingTitle}
          onClick={handleOpenEditDialog}
          sx={actionMenuItemSx}
        >
          <EditOutlinedIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>编辑</Typography>
        </MenuItem>
        <MenuItem
          disabled={isBusy || removing}
          onClick={handleDeleteSource}
          sx={actionMenuItemSx}
        >
          <DeleteIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>删除</Typography>
        </MenuItem>
      </Menu>
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>编辑来源标题</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label="标题"
            value={titleDraft}
            onChange={(event) => {
              setTitleDraft(event.target.value.slice(0, sourceTitleMaxChars))
              if (titleErrorText) {
                setTitleErrorText('')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleCommitEditTitle()
              }
            }}
            disabled={isUpdatingTitle}
            error={Boolean(titleErrorText)}
            helperText={titleErrorText || undefined}
            slotProps={{
              htmlInput: {
                maxLength: sourceTitleMaxChars,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={isUpdatingTitle}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCommitEditTitle}
            disabled={isUpdatingTitle}
          >
            {isUpdatingTitle ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
