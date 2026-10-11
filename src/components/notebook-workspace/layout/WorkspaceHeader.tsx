import { memo, useEffect, useState, type MouseEvent } from 'react'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { Box, CircularProgress, IconButton, InputBase, Menu, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AccountMenu } from '../../auth/AccountMenu'
import { workspaceRadius, workspaceSpace } from '../shared/ui/layoutTokens'
import {
  headerMenuIconSx,
  headerMenuItemSx,
  headerMenuPaperSx,
} from '../shared/ui/menuStyles'
import { workspaceTransitionPresets } from '../shared/ui/motionTokens'
import { workspaceIconSize, workspaceTypeRem } from '../shared/ui/typeTokens'

/**
 * Workbench chrome. The 48px row is sized together with its contents: 36px controls
 * leave 6px breathing top/bottom, and 20px glyphs keep the icon-to-button ratio sane.
 *
 * 标题走 20px 一档（原 14px），但行高和 36px 控件盒都不动：标题本身就是
 * `height: 36 / py: 0` 的 InputBase，字号变大只是把控件盒里的垂直余量吃掉，
 * 行高仍是 rowMinHeight，因此不需要再额外减 padding。
 *
 * Notebook deletion lives on the home list card only; the workspace header stays a
 * navigation + rename + account row so the destructive action never sits next to
 * everyday chrome.
 */
const headerChrome = {
  rowMinHeight: 48,
  controlHeight: 36,
  controlIconSize: workspaceIconSize.lg,
  accountAvatarSize: 32,
  statusSpinnerSize: workspaceIconSize.sm,
  titleFontSize: workspaceTypeRem.xl,
} as const

/**
 * 顶栏“更多选项”菜单要驱动的东西。对话面板不是 header 的子节点，
 * 因此这两个动作由页面从 ChatPanel 的 imperative handle 转发进来。
 */
export interface WorkspaceHeaderChatMenu {
  /** 刷新对话（清空上下文）是否禁用：无会话 / 刷新中 / 正在生成回复时。 */
  refreshDisabled: boolean
  /** 刷新对话进行中；header 用它复用尾部 spinner 反馈。 */
  isRefreshing: boolean
  onConfigureChat: () => void
  onRefreshChat: () => void
}

interface WorkspaceHeaderProps {
  notebookName: string
  isFetching: boolean
  isUpdatingName: boolean
  /** Commit only on blur / Enter — keeps keystrokes out of the workspace page tree. */
  onNotebookNameCommit: (value: string) => void
  /** 省略则不渲染“更多选项”入口，header 仍可单独使用。 */
  chatMenu?: WorkspaceHeaderChatMenu
}

export const WorkspaceHeader = memo(function WorkspaceHeader({
  notebookName,
  isFetching,
  isUpdatingName,
  onNotebookNameCommit,
  chatMenu,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation('workspace')
  const [draftName, setDraftName] = useState(notebookName)
  const [isEditing, setIsEditing] = useState(false)
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<HTMLElement | null>(null)

  const isRefreshingChat = chatMenu?.isRefreshing ?? false

  useEffect(() => {
    if (isEditing) {
      return
    }
    setDraftName(notebookName)
  }, [isEditing, notebookName])

  const commitDraft = () => {
    setIsEditing(false)
    onNotebookNameCommit(draftName)
  }

  const handleOpenMoreMenu = (event: MouseEvent<HTMLElement>) => {
    setMoreMenuAnchorEl(event.currentTarget)
  }

  const handleCloseMoreMenu = () => {
    setMoreMenuAnchorEl(null)
  }

  const handleConfigureChat = () => {
    setMoreMenuAnchorEl(null)
    chatMenu?.onConfigureChat()
  }

  const handleRefreshChat = () => {
    setMoreMenuAnchorEl(null)
    chatMenu?.onRefreshChat()
  }

  return (
    <Box
      component="header"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: '100%',
          minHeight: headerChrome.rowMinHeight,
          px: workspaceSpace.sm,
          py: 0,
          display: 'flex',
          alignItems: 'center',
          gap: workspaceSpace.xxs,
        }}
      >
        <IconButton
          component={Link}
          to="/"
          edge="start"
          color="inherit"
          size="small"
          aria-label={t('workspace:header.backAria')}
          sx={{
            ml: 0,
            width: headerChrome.controlHeight,
            height: headerChrome.controlHeight,
            p: 0,
          }}
        >
          <ArrowBackOutlinedIcon sx={{ fontSize: headerChrome.controlIconSize }} />
        </IconButton>
        <InputBase
          value={draftName}
          placeholder={t('workspace:header.namePlaceholder')}
          onChange={(event) => setDraftName(event.target.value)}
          onFocus={() => {
            setDraftName(notebookName)
            setIsEditing(true)
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const input = event.target as HTMLInputElement
              input.blur()
            }
          }}
          inputProps={{
            'aria-label': t('workspace:header.nameAria'),
            maxLength: 128,
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: { xs: '100%', md: 560 },
            height: headerChrome.controlHeight,
            px: workspaceSpace.md,
            py: 0,
            borderRadius: workspaceRadius.md,
            border: 1,
            borderColor: 'transparent',
            bgcolor: 'background.paper',
            cursor: 'text',
            fontSize: headerChrome.titleFontSize,
            lineHeight: 1.3,
            fontWeight: 600,
            letterSpacing: 0,
            transition: workspaceTransitionPresets.borderBg,
            '& input': {
              cursor: 'text',
              textOverflow: 'ellipsis',
              py: 0,
              height: '100%',
            },
            '&:hover': {
              bgcolor: 'background.default',
              borderColor: 'divider',
            },
            '&.Mui-focused': {
              bgcolor: 'action.selected',
              borderColor: 'primary.main',
            },
          }}
        />
        <Box
          sx={{
            ml: 'auto',
            // 尾部控件（头像 / 状态 spinner）比行内 8px 再退一格：头像是一块 32px 实心圆，
            // 和左侧 20px 线性 glyph 同 inset 时会显得贴边。退 8px 后头像视觉内缩 18px，
            // 和返回箭头的 16px ink 对齐；spinner 也不会顶到右边框。
            mr: workspaceSpace.sm,
            display: 'inline-flex',
            alignItems: 'center',
            gap: workspaceSpace.xxs,
            flexShrink: 0,
          }}
        >
          {chatMenu ? (
            <IconButton
              data-testid="workspace-more-options"
              size="small"
              aria-label={t('workspace:header.moreOptionsAria')}
              onClick={handleOpenMoreMenu}
              sx={{
                width: headerChrome.controlHeight,
                height: headerChrome.controlHeight,
                p: 0,
              }}
            >
              <MoreVertRoundedIcon sx={{ fontSize: headerChrome.controlIconSize }} />
            </IconButton>
          ) : null}
          <AccountMenu
            triggerSize={headerChrome.controlHeight}
            avatarSize={headerChrome.accountAvatarSize}
          />
          {(isFetching || isUpdatingName || isRefreshingChat) && (
            <CircularProgress size={headerChrome.statusSpinnerSize} />
          )}
        </Box>
      </Box>
      <Menu
        anchorEl={moreMenuAnchorEl}
        open={Boolean(moreMenuAnchorEl)}
        onClose={handleCloseMoreMenu}
        // 和账号菜单同一套外观与对齐方式：右对齐触发器，hairline 纸面。
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        elevation={0}
        slotProps={{ paper: { sx: headerMenuPaperSx } }}
      >
        <MenuItem
          data-testid="workspace-configure-chat"
          onClick={handleConfigureChat}
          sx={headerMenuItemSx}
        >
          <TuneRoundedIcon sx={headerMenuIconSx} />
          {t('workspace:header.configureChat')}
        </MenuItem>
        <MenuItem
          data-testid="workspace-refresh-chat"
          disabled={chatMenu?.refreshDisabled ?? true}
          onClick={handleRefreshChat}
          sx={headerMenuItemSx}
        >
          <RefreshRoundedIcon sx={headerMenuIconSx} />
          {t('workspace:header.refreshChat')}
        </MenuItem>
      </Menu>
    </Box>
  )
})
