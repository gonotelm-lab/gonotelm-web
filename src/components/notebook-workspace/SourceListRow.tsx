import { useState } from 'react'
import AddLinkIcon from '@mui/icons-material/AddLink'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import NotesIcon from '@mui/icons-material/Notes'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ReplayIcon from '@mui/icons-material/Replay'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { FlowLoadingOverlay } from './FlowLoadingOverlay'
import type { SourceListItem } from './sourceTypes'

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
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null)

  const actionMenuOpen = Boolean(actionAnchorEl)

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
            sx={{ minWidth: 40, minHeight: 34, px: 1, justifyContent: 'center' }}
          >
            <Tooltip
              title={<Typography sx={{ fontSize: 11 }}>打开链接</Typography>}
              placement="left"
              enterDelay={150}
            >
              <OpenInNewIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </Tooltip>
          </MenuItem>
        ) : null}
        {item.kind === 'text' || item.kind === 'file' ? (
          <MenuItem
            onClick={handlePreviewSource}
            sx={{ minWidth: 40, minHeight: 34, px: 1, justifyContent: 'center' }}
          >
            <Tooltip
              title={<Typography sx={{ fontSize: 11 }}>预览</Typography>}
              placement="left"
              enterDelay={150}
            >
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </Tooltip>
          </MenuItem>
        ) : null}
        {isFailed ? (
          <MenuItem
            disabled={isBusy || removing}
            onClick={handleRetrySource}
            sx={{ minWidth: 40, minHeight: 34, px: 1, justifyContent: 'center' }}
          >
            <Tooltip
              title={<Typography sx={{ fontSize: 11 }}>重试</Typography>}
              placement="left"
              enterDelay={150}
            >
              <ReplayIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Tooltip>
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={isBusy || removing}
          onClick={handleDeleteSource}
          sx={{ minWidth: 40, minHeight: 34, px: 1, justifyContent: 'center' }}
        >
          <Tooltip
            title={<Typography sx={{ fontSize: 11 }}>删除</Typography>}
            placement="left"
            enterDelay={150}
          >
            <DeleteIcon sx={{ fontSize: 16, color: 'error.main' }} />
          </Tooltip>
        </MenuItem>
      </Menu>
    </Box>
  )
}
