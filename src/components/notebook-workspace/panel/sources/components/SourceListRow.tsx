import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddLinkOutlinedIcon from '@mui/icons-material/AddLinkOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
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
import { isSameSourceListItem } from '../sourceListItemEquality'
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
import { resolveSourceTypeTone } from '../../../shared/ui/studioSemanticTones'
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
const sourceTypeIconSx = (theme: Theme, iconType: SourceListItem['iconType']) => {
  const tone = resolveSourceTypeTone(theme, iconType)
  return {
    color: tone.icon,
    fontSize: workspaceIconSize.md,
  }
}

interface SourceListRowProps {
  item: SourceListItem
  selectionColumnWidth?: number
  checked: boolean
  removing: boolean
  isBusy: boolean
  /** 无编辑权限时菜单只保留预览 / 打开 / 下载。 */
  canManageContent?: boolean
  onToggleItem: (id: string, checked: boolean) => void
  onDeleteItem: (id: string) => Promise<void>
  onRetryItem: (id: string) => Promise<void>
  onRenameItem: (id: string, title: string) => Promise<void>
  onPreviewItem: (item: SourceListItem) => Promise<void> | void
  previewLoading: boolean
}

/**
 * 行内容由 item 的字段决定（见 isSameSourceListItem）；item 按字段比较，其余 props 仍是浅比较。
 */
const areSourceListRowPropsEqual = (prev: SourceListRowProps, next: SourceListRowProps) =>
  prev.checked === next.checked
  && prev.removing === next.removing
  && prev.isBusy === next.isBusy
  && prev.canManageContent === next.canManageContent
  && prev.previewLoading === next.previewLoading
  && prev.selectionColumnWidth === next.selectionColumnWidth
  && prev.onToggleItem === next.onToggleItem
  && prev.onDeleteItem === next.onDeleteItem
  && prev.onRetryItem === next.onRetryItem
  && prev.onRenameItem === next.onRenameItem
  && prev.onPreviewItem === next.onPreviewItem
  && (prev.item === next.item || isSameSourceListItem(prev.item, next.item))

export const SourceListRow = memo(function SourceListRow({
  item,
  selectionColumnWidth = sourceSelectionColumnWidthPx,
  checked,
  removing,
  isBusy,
  canManageContent = true,
  onToggleItem,
  onDeleteItem,
  onRetryItem,
  onRenameItem,
  onPreviewItem,
  previewLoading,
}: SourceListRowProps) {
  const { t } = useTranslation(['sources', 'common'])
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
    onToggleItem(item.id, nextChecked)
  }

  const handleToggleRow = () => {
    if (editDialogOpen) return
    if (!rowSelectable) return
    commitToggleSelection(!checked)
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
    if (!canManageContent) {
      return
    }
    void onDeleteItem(item.id)
  }

  const handleRetrySource = () => {
    closeActionMenu()
    if (!canManageContent) {
      return
    }
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
    if (!canManageContent || removing || isUpdatingTitle) {
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
      setTitleErrorText(t('sources:editTitle.empty'))
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
        setTitleErrorText(t('sources:editTitle.failed'))
      })
      .finally(() => {
        setIsUpdatingTitle(false)
      })
  }

  const sourceTypeIconSxForItem = (theme: Theme) => sourceTypeIconSx(theme, item.iconType)
  const sourceTypeIcon =
    item.iconType === 'url' ? (
      <AddLinkOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'text' ? (
      <NotesOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'pdf' ? (
      <PictureAsPdfOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'epub' ? (
      <MenuBookOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'txt' ? (
      <DescriptionOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'markdown' ? (
      <ArticleOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'csv' ? (
      <TableChartOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'xlsx' ? (
      <TableChartOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'pptx' ? (
      <SlideshowOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'image' ? (
      <ImageOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : item.iconType === 'docx' ? (
      <DescriptionOutlinedIcon sx={sourceTypeIconSxForItem} />
    ) : (
      <DescriptionOutlinedIcon sx={sourceTypeIconSxForItem} />
    )

  return (
    <Box
      onClick={handleToggleRow}
      sx={{
        boxSizing: 'border-box',
        height: removing ? 0 : sourceListRowHeightPx,
        pl: workspaceSpace.xxs,
        pr: 0,
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
        // 操作触发器放在勾选框左侧：默认隐藏，hover 行、菜单打开、或焦点在触发器上时显示。
        '&:hover .source-action-trigger, .source-action-menu-open .source-action-trigger, .source-action-trigger:focus, .source-action-trigger:focus-visible': {
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
          gap: 2,
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <IconButton
          className="source-action-trigger"
          data-testid="source-action-trigger"
          size="small"
          aria-label={t('sources:row.actionsAria')}
          onClick={openActionMenu}
          sx={{
            p: 0.5,
            // 触屏设备无 hover，常显；桌面默认隐藏，hover 行 / 菜单打开 / 焦点在内时显示。
            opacity: 0,
            pointerEvents: 'none',
            '&:focus, &:focus-visible': {
              opacity: 1,
              pointerEvents: 'auto',
            },
            transition: workspaceTransitionPresets.opacityOnly,
          }}
        >
          <MoreHorizOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
        {isProcessing ? (
          <CircularProgress size={16} thickness={5} />
        ) : (
          <Checkbox
            size="small"
            checked={checked}
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
        // 菜单打开时固定触发器可见，避免鼠标离开后触发器消失、菜单被误点关闭。
        containerProps={{
          className: actionMenuOpen ? 'source-action-menu-open' : undefined,
        }}
      >
        <MenuItem
          data-testid="sources-action-preview"
          disabled={!isReady || isBusy || removing || previewLoading}
          onClick={handlePreviewSource}
          sx={actionMenuItemSx}
        >
          <PreviewOutlinedIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>{t('sources:row.preview')}</Typography>
        </MenuItem>
        {item.kind === 'url' ? (
          <MenuItem
            disabled={!item.urlContent}
            onClick={handleOpenSourceUrl}
            sx={actionMenuItemSx}
          >
            <OpenInNewOutlinedIcon sx={actionMenuIconSx} />
            <Typography sx={actionMenuTextSx}>{t('sources:row.open')}</Typography>
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={!isReady || isBusy || removing}
          onClick={handleDownloadSource}
          sx={actionMenuItemSx}
        >
          <DownloadOutlinedIcon sx={actionMenuIconSx} />
          <Typography sx={actionMenuTextSx}>{t('sources:row.download')}</Typography>
        </MenuItem>
        {canManageContent && isFailed ? (
          <MenuItem
            data-testid="sources-action-retry"
            disabled={isBusy || removing}
            onClick={handleRetrySource}
            sx={actionMenuItemSx}
          >
            <ReplayOutlinedIcon sx={actionMenuIconSx} />
            <Typography sx={actionMenuTextSx}>{t('sources:row.retry')}</Typography>
          </MenuItem>
        ) : null}
        {canManageContent ? (
          <MenuItem
            data-testid="sources-action-edit"
            disabled={removing || isUpdatingTitle}
            onClick={handleOpenEditDialog}
            sx={actionMenuItemSx}
          >
            <EditOutlinedIcon sx={actionMenuIconSx} />
            <Typography sx={actionMenuTextSx}>{t('sources:row.edit')}</Typography>
          </MenuItem>
        ) : null}
        {canManageContent ? (
          <MenuItem
            data-testid="sources-action-delete"
            disabled={isBusy || removing}
            onClick={handleDeleteSource}
            sx={actionMenuItemSx}
          >
            <DeleteOutlineOutlinedIcon sx={actionMenuIconSx} />
            <Typography sx={actionMenuTextSx}>{t('sources:row.delete')}</Typography>
          </MenuItem>
        ) : null}
      </Menu>
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('sources:editTitle.dialog')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label={t('sources:editTitle.label')}
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
            {t('common:action.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleCommitEditTitle}
            disabled={isUpdatingTitle}
          >
            {isUpdatingTitle ? t('common:action.saving') : t('common:action.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}, areSourceListRowPropsEqual)
