import { useState } from 'react'
import AddLinkIcon from '@mui/icons-material/AddLink'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import DownloadIcon from '@mui/icons-material/Download'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import NotesIcon from '@mui/icons-material/Notes'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import PreviewIcon from '@mui/icons-material/Preview'
import ReplayIcon from '@mui/icons-material/Replay'
import {
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import { FlowLoadingOverlay } from './FlowLoadingOverlay'
import type { SourceListItem } from './sourceTypes'

const previewableFileIconTypeSet = new Set<SourceListItem['iconType']>([
  'markdown',
  'pdf',
  'txt',
])

interface SourceListRowProps {
  item: SourceListItem
  checked: boolean
  removing: boolean
  isBusy: boolean
  onToggleItem: (id: string, checked: boolean) => void
  onDeleteItem: (id: string) => Promise<void>
  onRetryItem: (id: string) => Promise<void>
  onPreviewItem: (id: string) => void
}

export function SourceListRow({
  item,
  checked,
  removing,
  isBusy,
  onToggleItem,
  onDeleteItem,
  onRetryItem,
  onPreviewItem,
}: SourceListRowProps) {
  const isProcessing = item.status === 'uploading' || item.status === 'preparing'
  const isFailed = item.status === 'failed'
  const isAwaitingReady =
    item.status === 'inited' || item.status === 'uploading' || item.status === 'preparing'
  const rowSelectable = !isProcessing && !removing
  const canPreview =
    item.kind === 'text' ||
    (item.kind === 'file' && previewableFileIconTypeSet.has(item.iconType))
  const isFileDownloadOnly = item.kind === 'file' && !canPreview
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)

  const actionMenuOpen = Boolean(actionAnchorEl)
  const actionMenuItemSx = {
    minHeight: 34,
    px: 1.25,
    display: 'flex',
    alignItems: 'center',
  }
  const actionMenuTextSx = { fontSize: 12.5, lineHeight: 1.2, ml: 'auto', pl: 1.5 }

  const handleToggleRow = () => {
    if (!rowSelectable) return
    onToggleItem(item.id, !checked)
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

  const handlePreviewSource = () => {
    closeActionMenu()
    onPreviewItem(item.id)
  }

  const handleDownloadSource = () => {
    closeActionMenu()
    if (!item.fileUrl) return
    window.open(item.fileUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpenSourceUrl = () => {
    closeActionMenu()
    if (!item.urlContent) return
    window.open(item.urlContent, '_blank', 'noopener,noreferrer')
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
        sx={{ justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: 'center' }}>
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
          <Typography variant="body2" noWrap sx={{ fontSize: 13.5 }}>
            {item.name}
          </Typography>
        </Stack>
        <Box sx={{ width: 36, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isProcessing ? (
            <CircularProgress size={16} thickness={5} />
          ) : (
            <Checkbox
              size="small"
              checked={checked}
              disableRipple
              icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 16 }} />}
              checkedIcon={<CheckBoxIcon sx={{ fontSize: 16 }} />}
              sx={{ p: 0, m: 0 }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onToggleItem(item.id, e.target.checked)}
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
        {item.kind === 'url' ? (
          <MenuItem
            disabled={!item.urlContent}
            onClick={handleOpenSourceUrl}
            sx={actionMenuItemSx}
          >
            <OpenInNewIcon sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography sx={actionMenuTextSx}>打开链接</Typography>
          </MenuItem>
        ) : null}
        {canPreview ? (
          <MenuItem
            onClick={handlePreviewSource}
            sx={actionMenuItemSx}
          >
            <PreviewIcon sx={{ fontSize: 16 }} />
            <Typography sx={actionMenuTextSx}>预览</Typography>
          </MenuItem>
        ) : null}
        {isFileDownloadOnly ? (
          <MenuItem
            disabled={!item.fileUrl}
            onClick={handleDownloadSource}
            sx={actionMenuItemSx}
          >
            <DownloadIcon sx={{ fontSize: 16 }} />
            <Typography sx={actionMenuTextSx}>下载</Typography>
          </MenuItem>
        ) : null}
        {isFailed ? (
          <MenuItem
            disabled={isBusy || removing}
            onClick={handleRetrySource}
            sx={actionMenuItemSx}
          >
            <ReplayIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography sx={actionMenuTextSx}>重试</Typography>
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={isBusy || removing}
          onClick={handleDeleteSource}
          sx={actionMenuItemSx}
        >
          <DeleteIcon sx={{ fontSize: 16, color: 'error.main' }} />
          <Typography sx={actionMenuTextSx}>删除</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}
