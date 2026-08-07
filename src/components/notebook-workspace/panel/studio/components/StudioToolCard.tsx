import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import { alpha } from '@mui/material/styles'
import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material'
import type { StudioToolDefinition } from '../types'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceInteraction, workspaceMotion } from '../../../shared/ui/motionTokens'
import { workspaceIconSize, workspaceType } from '../../../shared/ui/typeTokens'

interface StudioToolCardProps {
  tool: StudioToolDefinition
  selected?: boolean
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
  onAdvancedClick?: () => void
}

export function StudioToolCard({
  tool,
  selected = false,
  disabled = false,
  pending = false,
  onClick,
  onAdvancedClick,
}: StudioToolCardProps) {
  const interactive = Boolean(onClick) && !disabled && !pending
  const Icon = tool.icon
  const statusLabel = pending
    ? '处理中...'
    : tool.availability === 'available'
      ? '已接入'
      : '即将支持'
  const tooltipLabel = tool.availability === 'available'
    ? tool.description
    : statusLabel
  const showAdvancedEntry = Boolean(tool.hasAdvancedConfig)

  return (
    <Tooltip title={tooltipLabel} arrow placement="top" enterDelay={240}
    >
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
            sx={(theme) => ({
              width: '100%',
              p: workspaceSpace.sm,
              border: '1px solid',
              borderColor: selected ? 'primary.main' : 'divider',
              borderRadius: workspaceRadius.md,
              opacity: disabled && !pending ? 0.62 : 1,
              bgcolor:
                selected
                  ? alpha(theme.palette.primary.main, 0.12)
                  : tool.availability === 'available'
                    ? alpha(theme.palette.primary.main, 0.04)
                    : theme.palette.background.default,
              transition:
                `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
                `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
                `box-shadow ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
                `opacity ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              boxShadow: selected ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
              ...(interactive
                ? {
                    cursor: workspaceInteraction.cursorPointer,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.14)}`,
                    },
                    '&:active': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  }
                : null),
            })}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={workspaceSpace.sm}
                sx={{ alignItems: 'center', minWidth: 0 }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'text.secondary',
                  }}
                >
                  <Icon sx={{ fontSize: workspaceIconSize.md }} />
                </Box>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ fontWeight: 600, lineHeight: 1.2, minWidth: 0 }}
                >
                  {tool.title}
                </Typography>
              </Stack>
              {pending ? (
                <HourglassBottomRoundedIcon
                  sx={(theme) => ({
                    fontSize: workspaceType.sm,
                    color: theme.workspacePalette.status.warning,
                    flexShrink: 0,
                  })}
                />
              ) : showAdvancedEntry ? (
                <Box
                  component="span"
                  role="button"
                  tabIndex={interactive ? 0 : -1}
                  data-testid="studio-tool-card-advanced-entry"
                  aria-disabled={!interactive}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (interactive) onAdvancedClick?.()
                  }}
                  onKeyDown={(e) => {
                    if (!interactive) return
                    if (e.key !== 'Enter' && e.key !== ' ') {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()
                    onAdvancedClick?.()
                  }}
                  sx={{
                    width: 24,
                    height: 24,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    cursor: interactive ? workspaceInteraction.cursorPointer : 'not-allowed',
                    color: interactive ? 'text.secondary' : 'action.disabled',
                    '&:hover': interactive
                      ? { color: 'primary.main', bgcolor: 'action.hover' }
                      : undefined,
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 1,
                    },
                  }}
                >
                  <EditRoundedIcon sx={{ fontSize: workspaceIconSize.sm }} />
                </Box>
              ) : (
                <ArrowOutwardRoundedIcon sx={{ fontSize: workspaceIconSize.sm, color: 'text.disabled' }} />
              )}
            </Stack>
          </Box>
        </ButtonBase>
      </Box>
    </Tooltip>
  )
}
