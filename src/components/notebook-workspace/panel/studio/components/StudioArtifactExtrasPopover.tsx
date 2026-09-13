import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import i18n from '@/i18n'
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

function getReportStyleLabels(): Record<string, string> {
  return {
    default: i18n.t('studio:style.report.default.label'),
    brief: i18n.t('studio:style.report.brief.label'),
    'study-guide': i18n.t('studio:style.report.studyGuide.label'),
    detailed: i18n.t('studio:style.report.detailed.label'),
  }
}

function getAudioStyleLabels(): Record<string, string> {
  return {
    'deep-research': i18n.t('studio:style.audio.deepResearch.label'),
    abstract: i18n.t('studio:style.audio.abstract.label'),
    discussion: i18n.t('studio:style.audio.discussion.label'),
    debate: i18n.t('studio:style.audio.debate.label'),
  }
}

function getVisualStyleLabels(): Record<string, string> {
  return {
    default: i18n.t('studio:infoGraphic.visual.default.label'),
    'hand-drawn': i18n.t('studio:infoGraphic.visual.handDrawn.label'),
    anime: i18n.t('studio:infoGraphic.visual.anime.label'),
    cute: i18n.t('studio:infoGraphic.visual.cute.label'),
    educational: i18n.t('studio:infoGraphic.visual.educational.label'),
    'minimal-2.5d': i18n.t('studio:infoGraphic.visual.minimal25d.label'),
  }
}

function getDetailLevelLabels(): Record<string, string> {
  return {
    concise: i18n.t('studio:infoGraphic.detail.concise.label'),
    standard: i18n.t('studio:infoGraphic.detail.standard.label'),
    detailed: i18n.t('studio:infoGraphic.detail.detailed.label'),
  }
}

function getOrientationLabels(): Record<string, string> {
  return {
    portrait: i18n.t('studio:infoGraphic.orientation.portrait'),
    landscape: i18n.t('studio:infoGraphic.orientation.landscape'),
    square: i18n.t('studio:infoGraphic.orientation.square'),
  }
}

function getSlidesVisualStyleLabels(): Record<string, string> {
  return {
    default: i18n.t('studio:style.slides.default.label'),
    educational: i18n.t('studio:style.slides.educational.label'),
    cute: i18n.t('studio:style.slides.cute.label'),
  }
}

function getVideoOverviewVisualStyleLabels(): Record<string, string> {
  return {
    default: i18n.t('studio:style.videoOverview.default.label'),
    educational: i18n.t('studio:style.videoOverview.educational.label'),
    cute: i18n.t('studio:style.videoOverview.cute.label'),
  }
}

function getLanguageLabels(): Record<string, string> {
  return {
    'zh-CN': i18n.t('studio:lang.zhCN'),
    'en-US': i18n.t('studio:lang.enUS'),
  }
}

function getCountLabels(): Record<string, string> {
  return {
    few: i18n.t('studio:count.few.label'),
    default: i18n.t('studio:count.default.label'),
    many: i18n.t('studio:count.many.label'),
  }
}

function getDifficultyLabels(): Record<string, string> {
  return {
    easy: i18n.t('studio:difficulty.easy.label'),
    medium: i18n.t('studio:difficulty.medium.label'),
    hard: i18n.t('studio:difficulty.hard.label'),
  }
}

function resolveExtrasEntries(artifact: StudioArtifactItem): ExtrasEntry[] {
  const extras = artifact.extras
  if (!extras) {
    return []
  }
  const tipLabel = i18n.t('studio:extras.label.tip')
  const styleLabel = i18n.t('studio:extras.label.style')
  const languageLabel = i18n.t('studio:extras.label.language')
  switch (artifact.kind) {
    case 'mindmap': {
      const e = extras as { tip?: string }
      return [
        { label: tipLabel, value: e.tip?.trim() || '—' },
      ]
    }
    case 'report': {
      const e = extras as { style?: string; language?: string; tip?: string }
      const reportStyleLabels = getReportStyleLabels()
      const languageLabels = getLanguageLabels()
      return [
        {
          label: styleLabel,
          value: reportStyleLabels[e.style || ''] || e.style || i18n.t('studio:style.report.default.label'),
        },
        { label: languageLabel, value: languageLabels[e.language || ''] || e.language || '—' },
        { label: tipLabel, value: e.tip?.trim() || '—' },
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
      const visualStyleLabels = getVisualStyleLabels()
      const detailLevelLabels = getDetailLevelLabels()
      const orientationLabels = getOrientationLabels()
      return [
        {
          label: i18n.t('studio:extras.label.visualStyle'),
          value: visualStyleLabels[e.visual_style || ''] || e.visual_style || i18n.t('studio:infoGraphic.visual.default.label'),
        },
        {
          label: i18n.t('studio:extras.label.detailLevel'),
          value: detailLevelLabels[e.detail_level || ''] || e.detail_level || '—',
        },
        {
          label: i18n.t('studio:extras.label.orientation'),
          value: orientationLabels[e.orientation || ''] || e.orientation || '—',
        },
        {
          label: i18n.t('studio:extras.label.textLanguage'),
          value: e.text_language || '—',
        },
        { label: tipLabel, value: e.prompt?.trim() || '—' },
      ]
    }
    case 'audio_overview': {
      const e = extras as {
        tip?: string
        language?: string
        style?: string
      }
      const audioStyleLabels = getAudioStyleLabels()
      const languageLabels = getLanguageLabels()
      return [
        { label: styleLabel, value: audioStyleLabels[e.style || ''] || e.style || '—' },
        { label: languageLabel, value: languageLabels[e.language || ''] || e.language || '—' },
        { label: tipLabel, value: e.tip?.trim() || '—' },
      ]
    }
    case 'flashcard':
    case 'quiz': {
      const e = extras as {
        count?: string
        difficulty?: string
        tip?: string
      }
      const countLabels = getCountLabels()
      const difficultyLabels = getDifficultyLabels()
      return [
        {
          label: i18n.t('studio:extras.label.countStyle'),
          value: countLabels[e.count || ''] || e.count || i18n.t('studio:count.default.label'),
        },
        {
          label: i18n.t('studio:extras.label.difficulty'),
          value: difficultyLabels[e.difficulty || ''] || e.difficulty || i18n.t('studio:difficulty.medium.label'),
        },
        { label: tipLabel, value: e.tip?.trim() || '—' },
      ]
    }
    case 'data_table': {
      const e = extras as { tip?: string }
      return [
        { label: tipLabel, value: e.tip?.trim() || '—' },
      ]
    }
    case 'slides': {
      const e = extras as { tip?: string; language?: string; visual_style?: string }
      const slidesVisualStyleLabels = getSlidesVisualStyleLabels()
      const languageLabels = getLanguageLabels()
      return [
        {
          label: i18n.t('studio:extras.label.visualStyle'),
          value:
            slidesVisualStyleLabels[e.visual_style || ''] ||
            e.visual_style ||
            i18n.t('studio:style.slides.default.label'),
        },
        { label: languageLabel, value: languageLabels[e.language || ''] || e.language || '—' },
        { label: tipLabel, value: e.tip?.trim() || '—' },
      ]
    }
    case 'video_overview': {
      const e = extras as { tip?: string; language?: string; visual_style?: string }
      const videoVisualStyleLabels = getVideoOverviewVisualStyleLabels()
      const languageLabels = getLanguageLabels()
      return [
        {
          label: i18n.t('studio:extras.label.visualStyle'),
          value:
            videoVisualStyleLabels[e.visual_style || ''] ||
            e.visual_style ||
            i18n.t('studio:style.videoOverview.default.label'),
        },
        { label: languageLabel, value: languageLabels[e.language || ''] || e.language || '—' },
        { label: tipLabel, value: e.tip?.trim() || '—' },
      ]
    }
    case 'note': {
      const e = extras as { chat_id?: string; msg_id?: string }
      return [
        { label: i18n.t('studio:extras.label.conversation'), value: e.chat_id?.trim() || '—' },
        { label: i18n.t('studio:extras.label.message'), value: e.msg_id?.trim() || '—' },
      ]
    }
  }
  return []
}

export const StudioArtifactExtrasPopover = memo(function StudioArtifactExtrasPopover({
  artifact,
  iconSx,
}: StudioArtifactExtrasPopoverProps) {
  const { t } = useTranslation(['studio', 'common'])
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const entries = resolveExtrasEntries(artifact)

  if (entries.length === 0) {
    return null
  }

  return (
    <>
      <Tooltip title={t('studio:extras.viewParams')}>
        <span>
          <IconButton
            size="small"
            aria-label={t('studio:extras.viewParams')}
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
          {t('studio:extras.title')}
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
