import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import { alpha } from '@mui/material/styles'
import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material'
import type { StudioToolDefinition } from '../types'

interface StudioToolCardProps {
  tool: StudioToolDefinition
  selected?: boolean
  disabled?: boolean
  pending?: boolean
  onClick?: () => void
}

export function StudioToolCard({
  tool,
  selected = false,
  disabled = false,
  pending = false,
  onClick,
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
            borderRadius: 1.5,
            textAlign: 'left',
          }}
        >
          <Box
            sx={(theme) => ({
              width: '100%',
              p: 1,
              border: '1px solid',
              borderColor: selected ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              opacity: disabled && !pending ? 0.62 : 1,
              bgcolor:
                selected
                  ? alpha(theme.palette.primary.main, 0.12)
                  : tool.availability === 'available'
                    ? alpha(theme.palette.primary.main, 0.05)
                    : alpha(theme.palette.text.primary, 0.02),
              transition:
                'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
              boxShadow: selected ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
              ...(interactive
                ? {
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.16)}`,
                    },
                  }
                : null),
            })}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
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
                  <Icon sx={{ fontSize: 17 }} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {tool.title}
                </Typography>
              </Stack>
              {pending ? (
                <HourglassBottomRoundedIcon sx={{ fontSize: 14.5, color: 'warning.main', flexShrink: 0 }} />
              ) : interactive ? (
                <ArrowOutwardRoundedIcon sx={{ fontSize: 14.5, color: 'text.disabled', flexShrink: 0 }} />
              ) : null}
            </Stack>
          </Box>
        </ButtonBase>
      </Box>
    </Tooltip>
  )
}
