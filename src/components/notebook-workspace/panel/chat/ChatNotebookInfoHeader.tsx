import { useCallback, useEffect, useRef, useState } from 'react'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import {
  Avatar,
  Box,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { getNotebookEmoji } from '../../../../lib/notebookEmoji'
import { formatNotebookDate } from '@/lib/formatNotebookDate'
import { workspaceRadiusPx, workspaceSpace } from '../../shared/ui/layoutTokens'
import { chatReadableColumnSx } from './layoutTokens'
import { workspaceTransitionPresets } from '../../shared/ui/motionTokens'
import { workspaceIconSize, workspaceType, workspaceTypeRem } from '../../shared/ui/typeTokens'

const notebookInfoTokens = {
  marginTop: 0,
  iconSlotSize: 34,
  titleLineClamp: 2,
  actionRowMinHeight: 28,
  actionIconSize: 16,
  /**
   * 封面固定 2.2:1：裁切比例在任何宽度下都一致（只缩放像素），
   * 高度随宽度平滑变化，不跨断点跳变。
   */
  coverAspectRatio: '2.2 / 1',
}

/**
 * 起始信息块与聊天正文共用聊天内容列（ChatMessagesList 的内层 Box）。
 * 封面占满该列；下方摘要/聊天记录再收窄到 readableContentMaxWidth 并居中。
 */

const fallbackNotebookName = 'Untitled notebook'

/**
 * 标题排版：保持 Geist UI 字号，不做超大字距（CJK 会不匀）。
 * 无封面与封面内共用，仅颜色不同。
 */
const titleSx = {
  minWidth: 0,
  fontSize: { xs: workspaceTypeRem.xl, md: '1.5rem' },
  lineHeight: 1.35,
  fontWeight: 600,
  letterSpacing: 0,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: notebookInfoTokens.titleLineClamp,
  WebkitBoxOrient: 'vertical',
  textOverflow: 'ellipsis',
} as const

/** 封面内的大标题：参考稿的体量，字号明显大于正文标题。 */
const coverTitleSx = {
  ...titleSx,
  fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.25rem' },
  lineHeight: 1.2,
  color: 'common.white',
  // 占满左右边界，多行时两端对齐；最后一行保持自然左对齐。
  width: '100%',
  textAlign: 'justify',
  textAlignLast: 'left',
} as const

const buildCopyActionButtonSx = (copied: boolean) => (theme: Theme) => ({
  p: 0,
  borderRadius: 0,
  color: copied ? theme.workspacePalette.status.success : 'text.disabled',
  bgcolor: 'transparent',
  transition: workspaceTransitionPresets.interactiveColorBorder,
  '&:hover': {
    bgcolor: 'transparent',
    color: copied ? theme.workspacePalette.status.success : 'text.secondary',
  },
})

export interface ChatNotebookOwner {
  nickname: string
  avatarUrl: string
}

interface ChatNotebookInfoHeaderProps {
  notebookId: string
  notebookName: string
  notebookDescription: string
  notebookSourceCount: number
  /** 笔记本创建时间（unix ms）；标题下方展示创建日期。 */
  notebookCreatedAt?: number
  /** 已设置封面时：封面作为标题背景，owner/标题压在图上。 */
  notebookCoverUrl?: string
  /** 共享笔记本的 owner；自己拥有时不传（不展示）。 */
  notebookOwner?: ChatNotebookOwner
  /** 是否为作者自定义摘要；false 表示展示中的摘要来自 AI。 */
  customizeDescription?: boolean
  descriptionLoading?: boolean
}

/** 头像 + 昵称；压在封面图上时改用白字与白色头像底。 */
function NotebookOwnerIdentity({
  owner,
  onCover = false,
}: {
  owner: ChatNotebookOwner
  onCover?: boolean
}) {
  const initial = Array.from(owner.nickname.trim())[0]?.toUpperCase() ?? '?'
  return (
    <Stack
      data-testid="chat-notebook-owner"
      direction="row"
      spacing={workspaceSpace.sm}
      sx={{ alignItems: 'center', minWidth: 0 }}
    >
      <Avatar
        src={owner.avatarUrl.trim() || undefined}
        alt=""
        sx={{
          width: onCover ? 30 : 24,
          height: onCover ? 30 : 24,
          flexShrink: 0,
          fontSize: onCover ? '0.95rem' : workspaceType.xs,
          fontWeight: 600,
          border: '1px solid',
          borderColor: onCover ? 'transparent' : 'divider',
          bgcolor: onCover ? 'common.white' : 'background.default',
          color: onCover ? 'text.primary' : 'text.secondary',
        }}
      >
        {initial}
      </Avatar>
      <Typography
        variant="body2"
        noWrap
        sx={{
          minWidth: 0,
          fontWeight: 500,
          letterSpacing: 0,
          fontSize: onCover ? { xs: '0.95rem', md: '1rem' } : undefined,
          color: onCover ? 'common.white' : 'text.secondary',
        }}
      >
        {owner.nickname}
      </Typography>
    </Stack>
  )
}

/**
 * 后端 `created_at` 由 UUIDv7 id 的前 48 位推导（`NewTimeFromId`）。
 * 若接口字段缺失/为 0（旧构建、缓存里的老数据），前端用同一规则兜底。
 */
function resolveNotebookCreatedAtMs(
  notebookId: string,
  createdAt?: number,
): number | undefined {
  if (createdAt && createdAt > 0) {
    return createdAt
  }
  const hex = notebookId.replace(/-/g, '')
  if (hex.length < 12) {
    return undefined
  }
  const ms = Number.parseInt(hex.slice(0, 12), 16)
  return Number.isFinite(ms) && ms > 0 ? ms : undefined
}

export function ChatNotebookInfoHeader({
  notebookId,
  notebookName,
  notebookDescription,
  notebookSourceCount,
  notebookCreatedAt,
  notebookCoverUrl,
  notebookOwner,
  customizeDescription = false,
  descriptionLoading = false,
}: ChatNotebookInfoHeaderProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [copied, setCopied] = useState(false)
  const copyResetTimerRef = useRef<number | null>(null)
  const clearCopyResetTimer = useCallback(() => {
    if (copyResetTimerRef.current) {
      window.clearTimeout(copyResetTimerRef.current)
      copyResetTimerRef.current = null
    }
  }, [])
  const title = notebookName.trim() || fallbackNotebookName
  const description = notebookDescription.trim()
  const normalizedCount =
    Number.isFinite(notebookSourceCount) && notebookSourceCount > 0
      ? Math.floor(notebookSourceCount)
      : 0
  const sourceCountLabel = t('common:sourceCount', { count: normalizedCount })
  const createdAtLabel = (() => {
    const createdAtMs = resolveNotebookCreatedAtMs(notebookId, notebookCreatedAt)
    return createdAtMs ? formatNotebookDate(createdAtMs) : ''
  })()
  // 标题下方的信息行：来源个数 · 创建日期（与首页卡片同一套日期格式）。
  const metaLabel = [sourceCountLabel, createdAtLabel].filter(Boolean).join(' · ')
  // 自定义模式始终展示来源标识；AI 模式仅在已有摘要时展示，避免空摘要仍声称「由 AI 生成」。
  const showDescriptionOrigin = customizeDescription || description.length > 0
  const descriptionOriginLabel = customizeDescription
    ? t('chat:notebookInfo.descriptionByAuthor')
    : t('chat:notebookInfo.descriptionByAi')

  /** 标题下方的信息行：来源标识 + 来源个数 · 创建日期；压在封面图上时用白字。 */
  const renderNotebookMeta = (onCover: boolean) => (
    <Stack
      data-testid="chat-notebook-meta"
      direction="row"
      spacing={workspaceSpace.sm}
      sx={{
        alignItems: 'center',
        minWidth: 0,
        color: onCover ? 'common.white' : 'text.secondary',
      }}
    >
      {showDescriptionOrigin ? (
        <Tooltip title={descriptionOriginLabel}>
          <Box
            component="span"
            data-testid={
              customizeDescription
                ? 'chat-notebook-description-origin-author'
                : 'chat-notebook-description-origin-ai'
            }
            aria-label={descriptionOriginLabel}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'inherit',
              lineHeight: 0,
            }}
          >
            {customizeDescription ? (
              <PersonOutlineOutlinedIcon sx={{ fontSize: workspaceIconSize.sm }} />
            ) : (
              <AutoAwesomeOutlinedIcon sx={{ fontSize: workspaceIconSize.sm }} />
            )}
          </Box>
        </Tooltip>
      ) : null}
      <Typography
        variant="caption"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: workspaceType.xs,
          letterSpacing: 0,
          color: 'inherit',
        }}
      >
        {metaLabel}
      </Typography>
    </Stack>
  )

  const copyPayload = [title, description, sourceCountLabel]
    .filter((part) => part.trim().length > 0)
    .join('\n')
  const canCopy = Boolean(copyPayload.trim())

  const handleCopyNotebookInfo = useCallback(() => {
    if (!canCopy) return
    void navigator.clipboard.writeText(copyPayload).then(() => {
      setCopied(true)
      clearCopyResetTimer()
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copyResetTimerRef.current = null
      }, 1200)
    }).catch(() => {
      setCopied(false)
    })
  }, [canCopy, clearCopyResetTimer, copyPayload])

  useEffect(() => {
    return clearCopyResetTimer
  }, [clearCopyResetTimer])

  return (
    <Box
      data-testid="chat-notebook-info-header"
      sx={{
        mt: notebookInfoTokens.marginTop,
      }}
    >
      <Stack spacing={workspaceSpace.sm} useFlexGap sx={{ minWidth: 0, flex: 1 }}>
        {notebookCoverUrl ? (
          /* 封面即标题背景：owner（非本人）+ 标题压在图上，左下角对齐。 */
          <Box
            data-testid="chat-notebook-cover"
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: notebookInfoTokens.coverAspectRatio,
              borderRadius: `${workspaceRadiusPx.lg}px`,
              overflow: 'hidden',
              bgcolor: 'common.black',
            }}
          >
            <Box
              component="img"
              src={notebookCoverUrl}
              alt=""
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background: (theme) =>
                  // 上透明、下加深：白色文字所在区域获得更强对比，顶部尽量保留封面原图。
                  `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0)} 0%, ${alpha(
                    theme.palette.common.black,
                    0.08,
                  )} 34%, ${alpha(theme.palette.common.black, 0.58)} 70%, ${alpha(
                    theme.palette.common.black,
                    0.9,
                  )} 100%)`,
              }}
            />
            <Stack
              spacing={workspaceSpace.sm}
              sx={{
                position: 'absolute',
                // sx 的位置属性不会乘 theme.spacing，必须写显式 px：
                // 距左边/底边移动端 40/32px，桌面 56/48px。
                // 左右边界一致：移动端 16px、桌面 24px；
                // meta 距底边移动端 8px、桌面 16px。
                left: { xs: '16px', md: '24px' },
                right: { xs: '16px', md: '24px' },
                bottom: { xs: '8px', md: '16px' },
                alignItems: 'flex-start',
              }}
            >
              {notebookOwner ? <NotebookOwnerIdentity owner={notebookOwner} onCover /> : null}
              <Typography
                variant="h5"
                component="h2"
                sx={coverTitleSx}
              >
                {title}
              </Typography>
              {renderNotebookMeta(true)}
            </Stack>
          </Box>
        ) : (
          <Box sx={chatReadableColumnSx}>
            <Stack spacing={workspaceSpace.sm}>
              <Stack
                direction="row"
                spacing={workspaceSpace.sm}
                sx={{ alignItems: 'center', minWidth: 0 }}
              >
                <Box
                  data-testid="chat-notebook-emoji"
                  aria-hidden
                  sx={{
                    flexShrink: 0,
                    width: notebookInfoTokens.iconSlotSize,
                    height: notebookInfoTokens.iconSlotSize,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    lineHeight: 1,
                  }}
                >
                  {getNotebookEmoji(notebookId)}
                </Box>
                {notebookOwner ? <NotebookOwnerIdentity owner={notebookOwner} /> : null}
              </Stack>

              <Typography variant="h5" component="h2" sx={titleSx}>
                {title}
              </Typography>
              {renderNotebookMeta(false)}
            </Stack>
          </Box>
        )}

        {/* 摘要/来源/复制：比封面略窄、居中的正文列。 */}
        <Box sx={chatReadableColumnSx}>
          <Stack spacing={workspaceSpace.sm}>
            {descriptionLoading ? (
          <Stack spacing={0.75} sx={{ width: '100%', minHeight: '1.6em' }}>
            <Skeleton
              data-testid="chat-notebook-description-skeleton"
              animation="wave"
              variant="rounded"
              width="88%"
              height={14}
            />
            <Skeleton
              animation="wave"
              variant="rounded"
              width="72%"
              height={14}
            />
            <Skeleton
              animation="wave"
              variant="rounded"
              width="56%"
              height={14}
            />
          </Stack>
        ) : (
          <Typography
            data-testid="chat-notebook-summary"
            variant="body1"
            color="text.secondary"
            sx={{
              width: '100%',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              // 摘要两端对齐；最后一行保持自然左对齐，避免字距被拉开。
              textAlign: 'justify',
              textAlignLast: 'left',
              letterSpacing: 0,
              minHeight: '1.6em',
            }}
          >
            {description || '\u00A0'}
          </Typography>
        )}

        <Box
          sx={{
            mt: workspaceSpace.xxs,
            minHeight: notebookInfoTokens.actionRowMinHeight,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip title={copied ? t('common:action.copied') : t('common:action.copy')}>
            <span>
              <IconButton
                data-testid="chat-notebook-copy-action"
                size="small"
                disabled={!canCopy}
                onClick={handleCopyNotebookInfo}
                sx={buildCopyActionButtonSx(copied)}
              >
                {copied ? (
                  <CheckIcon
                    sx={(theme) => ({
                      fontSize: notebookInfoTokens.actionIconSize,
                      color: theme.workspacePalette.status.success,
                    })}
                  />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: notebookInfoTokens.actionIconSize }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
