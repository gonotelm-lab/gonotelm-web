import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import ArrowOutwardOutlinedIcon from '@mui/icons-material/ArrowOutwardOutlined'
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined'
import { alpha } from '@mui/material/styles'
import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material'
import type { StudioToolDefinition } from '../types'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import {
  workspaceInteraction,
  workspaceMotion,
} from '../../../shared/ui/motionTokens'
import {
  resolveStudioToolTone,
  resolveStudioToolToneKey,
} from '../../../shared/ui/studioSemanticTones'
import { workspaceIconSize, workspaceType } from '../../../shared/ui/typeTokens'

interface StudioToolCardProps {
  tool: StudioToolDefinition
  selected?: boolean
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
  onAdvancedClick?: () => void
}

export const StudioToolCard = memo(function StudioToolCard({
  tool,
  selected = false,
  disabled = false,
  pending = false,
  onClick,
  onAdvancedClick,
}: StudioToolCardProps) {
  const { t } = useTranslation(['studio', 'common'])
  const interactive = Boolean(onClick) && !disabled && !pending
  const Icon = tool.icon
  const statusLabel = pending
    ? t('studio:tool.status.pending')
    : tool.availability === 'available'
      ? t('studio:tool.status.available')
      : t('studio:tool.status.comingSoon')
  const tooltipLabel = tool.availability === 'available'
    ? tool.description
    : statusLabel
  const showAdvancedEntry = Boolean(tool.hasAdvancedConfig) && Boolean(onAdvancedClick)
  const advancedInteractive = showAdvancedEntry && interactive
  const toneKey = resolveStudioToolToneKey({
    artifactKind: tool.artifactKind,
    toolId: tool.id,
  })

  const openAdvanced = () => {
    if (advancedInteractive) onAdvancedClick?.()
  }

  return (
    <Tooltip title={tooltipLabel} arrow placement="top" enterDelay={240}>
      <Box component="span" sx={{ display: 'block', width: '100%' }}>
        <ButtonBase
          onClick={interactive ? onClick : undefined}
          disabled={!interactive}
          sx={{
            display: 'block',
            width: '100%',
            borderRadius: workspaceRadius.md,
            textAlign: 'left',
          }}
        >
          <Box
            sx={(theme) => {
              const tone = resolveStudioToolTone(theme, toneKey)
              return {
                width: '100%',
                p: workspaceSpace.sm,
                border: '1px solid',
                borderColor: selected ? tone.accent : 'divider',
                borderRadius: workspaceRadius.lg,
                opacity: disabled && !pending ? 0.62 : 1,
                bgcolor: selected
                  ? tone.surface
                  : tool.availability === 'available'
                    ? 'background.paper'
                    : 'background.default',
                transition:
                  `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
                  `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
                  `opacity ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
                boxShadow: 'none',
                ...(interactive
                  ? {
                      cursor: workspaceInteraction.cursorPointer,
                      '&:hover': {
                        borderColor: tone.accent,
                        bgcolor: tone.surface,
                      },
                      '&:active': {
                        borderColor: tone.accent,
                        bgcolor: alpha(tone.accent, 0.12),
                      },
                    }
                  : null),
              }
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={workspaceSpace.sm}
                sx={{ alignItems: 'center', minWidth: 0 }}
              >
                {showAdvancedEntry ? (
                  <Box
                    component="span"
                    role="button"
                    tabIndex={advancedInteractive ? 0 : -1}
                    data-testid="studio-tool-card-advanced-entry"
                    aria-label={t('studio:tool.openSettingsAria', { title: tool.title })}
                    aria-disabled={!advancedInteractive}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      openAdvanced()
                    }}
                    onKeyDown={(e) => {
                      if (!advancedInteractive) return
                      if (e.key !== 'Enter' && e.key !== ' ') {
                        return
                      }
                      e.preventDefault()
                      e.stopPropagation()
                      openAdvanced()
                    }}
                    sx={(theme) => {
                      const tone = resolveStudioToolTone(theme, toneKey)
                      return {
                        width: 20,
                        height: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: tool.availability === 'available' ? tone.icon : 'text.disabled',
                        cursor: advancedInteractive
                          ? workspaceInteraction.cursorPointer
                          : 'not-allowed',
                        transition:
                          `transform ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
                          `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
                        ...(advancedInteractive
                          ? {
                              '&:hover': {
                                color: tone.accent,
                                transform: 'scale(1.18)',
                              },
                              '&:active': {
                                transform: 'scale(1.06)',
                              },
                              '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: tone.accent,
                                outlineOffset: 1,
                              },
                              [workspaceInteraction.reducedMotionQuery]: {
                                '&:hover': {
                                  transform: 'none',
                                  color: tone.accent,
                                },
                                '&:active': {
                                  transform: 'none',
                                },
                              },
                            }
                          : null),
                      }
                    }}
                  >
                    <Icon sx={{ fontSize: workspaceIconSize.md }} />
                  </Box>
                ) : (
                  <Box
                    sx={(theme) => {
                      const tone = resolveStudioToolTone(theme, toneKey)
                      return {
                        width: 20,
                        height: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: tool.availability === 'available' ? tone.icon : 'text.disabled',
                      }
                    }}
                  >
                    <Icon sx={{ fontSize: workspaceIconSize.md }} />
                  </Box>
                )}
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ fontWeight: 600, lineHeight: 1.2, minWidth: 0 }}
                >
                  {tool.title}
                </Typography>
              </Stack>
              {pending ? (
                <HourglassBottomOutlinedIcon
                  sx={(theme) => ({
                    fontSize: workspaceType.sm,
                    color: theme.workspacePalette.status.warning,
                    flexShrink: 0,
                  })}
                />
              ) : showAdvancedEntry ? null : (
                <ArrowOutwardOutlinedIcon sx={{ fontSize: workspaceIconSize.sm, color: 'text.disabled' }} />
              )}
            </Stack>
          </Box>
        </ButtonBase>
      </Box>
    </Tooltip>
  )
})
