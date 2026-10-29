import { memo, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AccountMenu } from '../../auth/AccountMenu'
import { BrandMark } from '../../brand/BrandMark'
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
 * 左右两条边轨按 ink 对齐，不按盒子对齐：左侧 26px 标记退 4px 落 17px，右侧
 * 32px 头像退 8px 落 18px —— 实心图形比线性 glyph 更贴边，差值 1px 内看着才齐平。
 *
 * 标题走 20px 一档（原 14px），但行高和 36px 控件盒都不动：标题本身就是
 * `height: 36 / py: 0` 的 InputBase，字号变大只是把控件盒里的垂直余量吃掉，
 * 行高仍是 rowMinHeight，因此不需要再额外减 padding。
 *
 * Notebook deletion lives on the home list card only; the workspace header stays a
 * navigation + rename + account row so the destructive action never sits next to
 * everyday chrome.
 *
 * 最左是品牌标记，它本身就是回首页入口（原返回箭头）：两者同目标，并排摆会多出
 * 一个重复的「回首页」控件，所以只留一个。图形保持装饰（`aria-hidden`），链接的
 * 无障碍名字由 IconButton 的 aria-label 提供。
 *
 * 「创建笔记本」仍是占位：按设计稿先放进尾部控件组，不接行为。
 * 「分享」只对 owner 展示：页面确认权限后才传入回调，没有回调就不渲染按钮，
 * 避免非 owner 点开后被后端拒绝。
 */
const headerChrome = {
  rowMinHeight: 48,
  controlHeight: 36,
  controlIconSize: workspaceIconSize.lg,
  brandMarkSize: 26,
  accountAvatarSize: 32,
  statusSpinnerSize: workspaceIconSize.sm,
  titleFontSize: workspaceTypeRem.xl,
} as const

/**
 * 尾部文字按钮（占位）与 36px 图标控件同高，和标题输入框共用一行基线。
 * 字号 / 字重 / 圆角都交给 theme 的 MuiButton（14px / 600 / 8px），这里只定
 * 占位需要的盒子与图标间距。
 * 颜色走 `color="inherit"`（body ink），不用 theme 默认的 primary 绿：
 * 顶栏占位入口不抢强调色，等接了行为再决定是否需要 forest fill。
 * xs 下隐藏：375px 宽的顶栏放不下「标记 + 标题 + 两个文字按钮 + 更多 + 头像」，
 * 标题会被压成一条缝；sm（≥600px）起按设计稿显示。
 */
const headerActionButtonSx = {
  display: { xs: 'none', sm: 'inline-flex' },
  flexShrink: 0,
  height: headerChrome.controlHeight,
  // MUI 文本按钮默认 min-width: 64px，会把「分享」撑得比图标 + 文字更宽。
  minWidth: 0,
  px: workspaceSpace.sm,
  whiteSpace: 'nowrap',
  '& .MuiButton-startIcon': {
    marginRight: workspaceSpace.sm,
    marginLeft: 0,
  },
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
  /** 公开笔记本：标题右侧补一个可见性图标。 */
  isPublic?: boolean
  /** 仅 owner 可改名；没有权限时标题变成只读文本。 */
  canRenameNotebook?: boolean
  /** Commit only on blur / Enter — keeps keystrokes out of the workspace page tree. */
  onNotebookNameCommit: (value: string) => void
  /** 打开分享设置对话框；仅 owner 传入，省略时整个分享按钮不渲染。 */
  onShareNotebook?: () => void
  /** 打开「自定义笔记本」对话框；仅 can_manage_notebook 传入。 */
  onCustomizeNotebook?: () => void
  /** 省略则不渲染“更多选项”入口，header 仍可单独使用。 */
  chatMenu?: WorkspaceHeaderChatMenu
}

export const WorkspaceHeader = memo(function WorkspaceHeader({
  notebookName,
  isFetching,
  isUpdatingName,
  isPublic = false,
  canRenameNotebook = true,
  onNotebookNameCommit,
  onShareNotebook,
  onCustomizeNotebook,
  chatMenu,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation('workspace')
  const [draftName, setDraftName] = useState(notebookName)
  const [isEditing, setIsEditing] = useState(false)
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<HTMLElement | null>(null)

  // 无标题时兜底成「未命名笔记本」；编辑分支的空串交给 placeholder 展示同一段文案，
  // 避免把 fallback 当成真实标题写进输入值（否则保存会落一个假名字）。
  const displayName = notebookName.trim() || t('workspace:header.namePlaceholder')

  // 标题框宽度跟随文本：隐藏 span 用同样式量出 ink 宽度，输入框在量宽上加
  // px padding（md=12 两边 24）+ 透明边框（2px）+ 少量呼吸余量。空值时量
  // fallback 文案，输入框不会缩成一条缝。文本变化每个按键重测，字体换装
  // （webfont 晚于首次测量生效）由 ResizeObserver 兜底纠正，避免假截断。
  const measureText = isEditing ? draftName || displayName : displayName
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const [nameWidth, setNameWidth] = useState(0)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (el) {
      setNameWidth(el.offsetWidth)
    }
  }, [measureText])

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(() => {
      setNameWidth(el.offsetWidth)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [])

  const isRefreshingChat = chatMenu?.isRefreshing ?? false
  const showMoreMenu = Boolean(chatMenu || onCustomizeNotebook)

  useEffect(() => {
    if (isEditing) {
      return
    }
    setDraftName(notebookName)
  }, [isEditing, notebookName])

  const commitDraft = () => {
    setIsEditing(false)
    if (!canRenameNotebook) {
      return
    }
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

  const handleCustomizeNotebook = () => {
    setMoreMenuAnchorEl(null)
    onCustomizeNotebook?.()
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
          position: 'relative',
          width: '100%',
          minHeight: headerChrome.rowMinHeight,
          px: workspaceSpace.sm,
          py: 0,
          display: 'flex',
          alignItems: 'center',
          gap: workspaceSpace.xxs,
        }}
      >
        {/* 品牌标记兼回首页入口。
            盒 36px：和尾部「更多 / 头像」同高，行内上下各留 6px（48 - 36）。
            标记 26px：与首页顶栏同一尺寸，实心块比线性 glyph 重，但面宽仍小于
            32px 头像，不抢账号控件的视觉权重；盒内居中，四周留 5px 让 hover 底色
            不贴图形。
            盒再退 4px（ml 覆盖 edge="start" 自带的 -3px）：标记 ink 落在 17px，
            与右侧头像 ink 的 18px 对齐，左右两条边轨看起来才是一根线。 */}
        <IconButton
          component={Link}
          to="/"
          edge="start"
          color="inherit"
          size="small"
          aria-label={t('workspace:header.backAria')}
          sx={{
            ml: workspaceSpace.xxs,
            width: headerChrome.controlHeight,
            height: headerChrome.controlHeight,
            p: 0,
          }}
        >
          <BrandMark size={headerChrome.brandMarkSize} />
        </IconButton>
        {/* 量宽 ink 镜像：与标题框同字体字号字重，只用于测量文本宽度，不参与布局。 */}
        <span
          ref={measureRef}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: 'hidden',
            whiteSpace: 'pre',
            fontSize: headerChrome.titleFontSize,
            fontWeight: 600,
            letterSpacing: 0,
            pointerEvents: 'none',
          }}
        >
          {measureText}
        </span>
        {canRenameNotebook ? (
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
              if (event.key !== 'Enter') {
                return
              }
              event.preventDefault()
              const input = event.target as HTMLInputElement
              input.blur()
            }}
            inputProps={{
              'aria-label': t('workspace:header.nameAria'),
              maxLength: 128,
            }}
            sx={{
              // 宽度跟随文本 ink（隐藏 span 量宽）：文本 + px padding 24 + 透明边框 2 +
              // ~6px 呼吸余量，保证不因亚像素舍入出现假「...」。只有文本超过
              // md 的 560 上限（或行空间被挤压）才走输入内 ellipsis。
              width: nameWidth ? nameWidth + 32 : undefined,
              maxWidth: { xs: '100%', md: 560 },
              flex: '0 1 auto',
              minWidth: 0,
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
        ) : (
          /*
            无改名权限时直接渲染纯文本：编辑入口整体隐藏，而不是留一个只读输入框，
            避免看起来仍可点、可改。
          */
          <Typography
            component="h1"
            data-testid="workspace-title"
            title={displayName}
            noWrap
            sx={{
              flex: '0 1 auto',
              minWidth: 0,
              maxWidth: { xs: '100%', md: 560 },
              height: headerChrome.controlHeight,
              px: workspaceSpace.md,
              display: 'flex',
              alignItems: 'center',
              fontSize: headerChrome.titleFontSize,
              lineHeight: 1.3,
              fontWeight: 600,
              letterSpacing: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </Typography>
        )}
        {/* 公开可见性示意：弱化为次级 ink，只指示“公开”，不参与主操作。 */}
        {isPublic ? (
          <Tooltip title={t('workspace:header.publicAria')} placement="bottom">
            <PublicOutlinedIcon
              color="primary"
              aria-label={t('workspace:header.publicAria')}
              sx={{
                flexShrink: 0,
                ml: workspaceSpace.lg,
                fontSize: headerChrome.controlIconSize,
              }}
            />
          </Tooltip>
        ) : null}
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
          {/* 创建笔记本仍是占位；分享打开页面的分享设置对话框。 */}
          <Button
            data-testid="workspace-create-notebook"
            variant="text"
            color="inherit"
            startIcon={<AddOutlinedIcon sx={{ fontSize: headerChrome.controlIconSize }} />}
            sx={headerActionButtonSx}
          >
            {t('workspace:header.createNotebook')}
          </Button>
          {onShareNotebook ? (
            <Button
              data-testid="workspace-share-notebook"
              variant="text"
              color="inherit"
              startIcon={<IosShareOutlinedIcon sx={{ fontSize: headerChrome.controlIconSize }} />}
              onClick={onShareNotebook}
              sx={headerActionButtonSx}
            >
              {t('workspace:header.share')}
            </Button>
          ) : null}
          {showMoreMenu ? (
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
        {onCustomizeNotebook ? (
          <MenuItem
            data-testid="workspace-customize-notebook"
            onClick={handleCustomizeNotebook}
            sx={headerMenuItemSx}
          >
            <DescriptionOutlinedIcon sx={headerMenuIconSx} />
            {t('workspace:header.customizeNotebook')}
          </MenuItem>
        ) : null}
        {chatMenu ? (
          <MenuItem
            data-testid="workspace-configure-chat"
            onClick={handleConfigureChat}
            sx={headerMenuItemSx}
          >
            <TuneRoundedIcon sx={headerMenuIconSx} />
            {t('workspace:header.configureChat')}
          </MenuItem>
        ) : null}
        {chatMenu ? (
          <MenuItem
            data-testid="workspace-refresh-chat"
            disabled={chatMenu.refreshDisabled}
            onClick={handleRefreshChat}
            sx={headerMenuItemSx}
          >
            <RefreshRoundedIcon sx={headerMenuIconSx} />
            {t('workspace:header.refreshChat')}
          </MenuItem>
        ) : null}
      </Menu>
    </Box>
  )
})
