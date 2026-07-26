import { useEffect, useState } from 'react'
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
import type { Theme } from '@mui/material/styles'
import { FlowLoadingOverlay } from './FlowLoadingOverlay'
import { downloadSourceItemParsedContent } from './sourceItemDownload'
import type { SourceListItem } from '../types/sourceTypes'
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '../../../shared/ui/layoutTokens'
import {
  workspaceInteraction,
  workspaceMotion,
  workspaceTransitionPresets,
} from '../../../shared/ui/motionTokens'
import { workspaceIconSize, workspaceType } from '../../../shared/ui/typeTokens'
import {
  sourceListRowHeightPx,
  sourceSelectionColumnWidthPx,
  sourceTypeIconBoxPx,
} from '../sourceListLayout'

const sourceTitleMaxChars = 64
const sourceExitTransition =
  `opacity ${workspaceMotion.durationExitMs}ms ${workspaceMotion.easingStandard}, ` +
  `transform ${workspaceMotion.durationExitMs}ms ${workspaceMotion.easingStandard}, ` +
  `height ${workspaceMotion.durationExitMs}ms ${workspaceMotion.easingStandard}, ` +
  `margin ${workspaceMotion.durationExitMs}ms ${workspaceMotion.easingStandard}`
const sourceTypeIconSx = (theme: Theme) => ({
  color: theme.workspacePalette?.source?.typeIcon ?? 'text.secondary',
  fontSize: workspaceIconSize.md,
})

interface SourceListRowProps {
  item: SourceListItem
  selectionColumnWidth?: number
  checked: boolean
  removing: boolean
  isBusy: boolean
  onToggleItem: (id: string, checked: boolean) => void
  onDeleteItem: (id: string) => Promise<void>
  onRetryItem: (id: string) => Promise<void>
  onRenameItem: (id: string, title: string) => Promise<void>
  onPreviewItem: (item: SourceListItem) => Promise<void> | void
  previewLoading: boolean
}

export function SourceListRow({
  item,
  selectionColumnWidth = sourceSelectionColumnWidthPx,
  checked,
  removing,
  isBusy,
  onToggleItem,
  onDeleteItem,
  onRetryItem,
  onRenameItem,
  onPreviewItem,
  previewLoading,
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
    if (optimisticChecked === checked) {
      return
    }
    queueMicrotask(() => {
      setOptimisticChecked(checked)
    })
  }, [checked, optimisticChecked])

  const actionMenuOpen = Boolean(actionAnchorEl)
  const actionMenuItemSx = {
    minHeight: 34,
    px: workspaceSpace.md,
    display: 'flex',
    alignItems: 'center',
  }
  const actionMenuIconSx = { fontSize: workspaceIconSize.md, color: 'text.secondary' }
  const actionMenuTextSx = {
    fontSize: workspaceType.xs,
    lineHeight: 1.2,
    ml: 'auto',
    pl: workspaceSpace.md,
  }

  const commitToggleSelection = (nextChecked: boolean) => {
    setOptimisticChecked(nextChecked)
    onToggleItem(item.id, nextChecked)
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
      <AddLinkIcon sx={sourceTypeIconSx} />
    ) : item.iconType === 'text' ? (
      <NotesIcon sx={sourceTypeIconSx} />
    ) : item.iconType === 'pdf' ? (
      <PictureAsPdfIcon sx={sourceTypeIconSx} />
    ) : item.iconType === 'epub' ? (
      <MenuBookIcon sx={sourceTypeIconSx} />
    ) : item.iconType === 'txt' ? (
      <DescriptionIcon sx={sourceTypeIconSx} />
    ) : item.iconType === 'markdown' ? (
      <DescriptionIcon sx={sourceTypeIconSx} />
    ) : (
      <DescriptionIcon sx={sourceTypeIconSx} />
    )

  return (
    <Box
      onClick={handleToggleRow}
      sx={{
        boxSizing: 'border-box',
        height: removing ? 0 : sourceListRowHeightPx,
        px: workspaceSpace.xxs,
        opacity: removing ? 0 : 1,
        transform: removing ? 'translateX(-4px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: workspaceRadius.md,
        bgcolor: 'transparent',
        cursor: rowSelectable ? workspaceInteraction.cursorPointer : 'default',
        display: 'flex',
        alignItems: 'center',
        columnGap: workspaceLayout.listInlineGap,
        transition: removing
          ? sourceExitTransition
          : workspaceTransitionPresets.interactiveColorBorder,
        pointerEvents: removing ? 'none' : 'auto',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        '&:active': {
          bgcolor: 'action.selected',
        },
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
        spacing={workspaceLayout.listInlineGap}
        sx={{
          minWidth: 0,
          alignItems: 'center',
          flex: 1,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: sourceTypeIconBoxPx,
            height: sourceTypeIconBoxPx,
            flexShrink: 0,
          }}
        >
          <Box
            className="source-type-icon"
            sx={{
              width: '100%',
              height: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 1,
              transition: workspaceTransitionPresets.opacityOnly,
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
              transition: workspaceTransitionPresets.opacityOnly,
            }}
          >
            <MoreHorizIcon sx={{ fontSize: workspaceIconSize.md }} />
          </IconButton>
        </Box>
        <Typography
          variant="body2"
          noWrap
          sx={(theme) => ({
            m: 0,
            fontSize: workspaceType.sm,
            lineHeight: 1.25,
            color: isFailed
              ? (theme.workspacePalette?.status?.error ?? 'error.main')
              : 'text.primary',
          })}
        >
          {item.name}
        </Typography>
      </Stack>
      <Box
        sx={{
          width: selectionColumnWidth,
          minWidth: selectionColumnWidth,
          height: '100%',
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {isProcessing ? (
          <CircularProgress size={16} thickness={5} />
        ) : (
          <Checkbox
            size="small"
            checked={optimisticChecked}
            disableRipple
            icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: workspaceIconSize.md }} />}
            checkedIcon={<CheckBoxIcon sx={{ fontSize: workspaceIconSize.md }} />}
            sx={{ p: 0, m: 0 }}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => commitToggleSelection(e.target.checked)}
          />
        )}
      </Box>

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
