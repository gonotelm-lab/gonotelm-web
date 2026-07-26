import { memo, useState } from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import type { StudioArtifactItem } from '../types'
import { workspaceType } from '../../../shared/ui/typeTokens'

interface StudioArtifactExtrasPopoverProps {
  artifact: StudioArtifactItem
  iconSx?: object
}

interface ExtrasEntry {
  label: string
  value: string
}

const reportStyleLabels: Record<string, string> = {
  default: '默认',
  brief: '简报文档',
  'study-guide': '学习指南',
  detailed: '深度解读',
}

const audioStyleLabels: Record<string, string> = {
  'deep-research': '深度研究',
  abstract: '摘要',
  discussion: '讨论',
  debate: '辩论',
}

const visualStyleLabels: Record<string, string> = {
  default: '默认',
  'hand-drawn': '手绘',
  anime: '动漫',
  cute: '可爱',
  educational: '教学科普',
  'minimal-2.5d': '极简2.5D',
}

const detailLevelLabels: Record<string, string> = {
  concise: '简略',
  standard: '标准',
  detailed: '详细',
}

const orientationLabels: Record<string, string> = {
  portrait: '竖屏',
  landscape: '横屏',
  square: '方图',
}

const languageLabels: Record<string, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
}

function resolveExtrasEntries(artifact: StudioArtifactItem): ExtrasEntry[] {
  const extras = artifact.extras
  if (!extras) {
    return []
  }
  switch (artifact.kind) {
    case 'mindmap': {
      const e = extras as { tip?: string }
      return [
        { label: '附加提示', value: e.tip?.trim() || '—' },
      ]
    }
    case 'report': {
      const e = extras as { style?: string; language?: string; tip?: string }
      return [
        { label: '风格', value: reportStyleLabels[e.style || ''] || e.style || '默认' },
        { label: '语言', value: languageLabels[e.language || ''] || e.language || '—' },
        { label: '附加提示', value: e.tip?.trim() || '—' },
      ]
    }
    case 'info_graphic': {
      const e = extras as {
        prompt?: string
        text_language?: string
        orientation?: string
        detail_level?: string
        visual_style?: string
      }
      return [
        { label: '视觉风格', value: visualStyleLabels[e.visual_style || ''] || e.visual_style || '默认' },
        { label: '探索深度', value: detailLevelLabels[e.detail_level || ''] || e.detail_level || '—' },
        { label: '画面方向', value: orientationLabels[e.orientation || ''] || e.orientation || '—' },
        { label: '文字语言', value: e.text_language || '—' },
        { label: '附加提示', value: e.prompt?.trim() || '—' },
      ]
    }
    case 'audio_overview': {
      const e = extras as {
        tip?: string
        language?: string
        style?: string
      }
      return [
        { label: '风格', value: audioStyleLabels[e.style || ''] || e.style || '—' },
        { label: '语言', value: languageLabels[e.language || ''] || e.language || '—' },
        { label: '附加提示', value: e.tip?.trim() || '—' },
      ]
    }
    case 'flashcard':
    case 'quiz': {
      const e = extras as {
        count?: string
        difficulty?: string
        tip?: string
      }
      const countLabels: Record<string, string> = {
        few: '少',
        default: '默认',
        many: '多',
      }
      const difficultyLabels: Record<string, string> = {
        easy: '简单',
        medium: '中等',
        hard: '困难',
      }
      return [
        { label: '数量风格', value: countLabels[e.count || ''] || e.count || '默认' },
        { label: '难度', value: difficultyLabels[e.difficulty || ''] || e.difficulty || '中等' },
        { label: '附加提示', value: e.tip?.trim() || '—' },
      ]
    }
    case 'data_table': {
      const e = extras as { tip?: string }
      return [
        { label: '附加提示', value: e.tip?.trim() || '—' },
      ]
    }
    case 'note': {
      const e = extras as { chat_id?: string; msg_id?: string }
      return [
        { label: '对话', value: e.chat_id?.trim() || '—' },
        { label: '消息', value: e.msg_id?.trim() || '—' },
      ]
    }
  }
  return []
}

export const StudioArtifactExtrasPopover = memo(function StudioArtifactExtrasPopover({
  artifact,
  iconSx,
}: StudioArtifactExtrasPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const entries = resolveExtrasEntries(artifact)

  if (entries.length === 0) {
    return null
  }

  return (
    <>
      <Tooltip title="查看生成参数">
        <span>
          <IconButton
            size="small"
            aria-label="查看生成参数"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={iconSx}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { maxWidth: 360, p: workspaceSpace.md, mt: workspaceSpace.xxs, borderRadius: workspaceRadius.lg },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: workspaceSpace.sm }}>
          生成参数
        </Typography>
        <Stack spacing={workspaceSpace.sm}>
          {entries.map((entry) => (
            <Stack
              key={entry.label}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 72, flexShrink: 0 }}
              >
                {entry.label}
              </Typography>
              {entry.value === '—' ? (
                <Typography variant="body2" color="text.disabled">
                  —
                </Typography>
              ) : (
                <Box sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                  {entry.value.length > 60 ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {entry.value}
                    </Typography>
                  ) : (
                    <Chip
                      label={entry.value}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, borderRadius: workspaceRadius.sm, '& .MuiChip-label': { px: workspaceSpace.sm, fontSize: workspaceType.xs } }}
                    />
                  )}
                </Box>
              )}
            </Stack>
          ))}
        </Stack>
      </Popover>
    </>
  )
})