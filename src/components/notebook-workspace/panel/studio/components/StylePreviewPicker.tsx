import { memo, useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { workspaceDialogLayout } from '../../../shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceMotion } from '../../../shared/ui/motionTokens'
import { subtleScrollbarSx } from '../../../shared/ui/scrollbar'
import { workspaceIconSize } from '../../../shared/ui/typeTokens'
import { settingsToggleButtonSx } from '../../chat/chatSettings'
import type { StylePreviewOption } from '../stylePreviewSettings'

export type { StylePreviewOption }

interface StylePreviewPickerProps {
  value: string
  options: StylePreviewOption[]
  onChange: (value: string) => void
  ariaLabel?: string
}

/** Wide enough to read a 16:9 style thumbnail; 3 fit a `sm` dialog without scroll. */
const previewCardWidthPx = 164

/** Slides and info graphic style art are both 16:9; keep the frame so mixed sizes never reflow the row. */
const previewCardAspectRatio = '16 / 9'

/**
 * Style picker with two presentations:
 * - preview cards (image + label), horizontal and scrollable, when the backend
 *   returned preview images;
 * - the original pills, when there is nothing to preview (error / empty / no image).
 */
export const StylePreviewPicker = memo(function StylePreviewPicker({
  value,
  options,
  onChange,
  ariaLabel,
}: StylePreviewPickerProps) {
  const theme = useTheme()
  const hasPreviewImages = options.some((option) => !!option.previewUrl)

  const handleChange = (_event: React.MouseEvent<HTMLElement>, nextValue: string | null) => {
    if (nextValue) {
      onChange(nextValue)
    }
  }

  if (!hasPreviewImages) {
    return (
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={handleChange}
        aria-label={ariaLabel}
        sx={{
          mt: workspaceDialogLayout.controlMt,
          flexWrap: 'wrap',
          gap: workspaceDialogLayout.toggleGap,
          border: 'none',
        }}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value} sx={settingsToggleButtonSx}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    )
  }

  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={handleChange}
      aria-label={ariaLabel}
      sx={{
        mt: workspaceDialogLayout.controlMt,
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        gap: workspaceDialogLayout.toggleGap,
        border: 'none',
        borderRadius: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x proximity',
        ...subtleScrollbarSx(theme),
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <ToggleButton
            key={option.value}
            value={option.value}
            sx={{
              flex: '0 0 auto',
              scrollSnapAlign: 'start',
              width: previewCardWidthPx,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              overflow: 'hidden',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: workspaceRadius.md,
              textTransform: 'none',
              transition: [
                `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
                `outline-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              ].join(', '),
              // Beat the component's own `sizeMedium` padding.
              '&.MuiToggleButton-sizeMedium': {
                padding: 0,
              },
              '&.MuiToggleButtonGroup-grouped': {
                borderRadius: `${workspaceRadius.md} !important`,
                margin: 0,
              },
              '&.MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                borderLeft: '1px solid',
                borderColor: 'divider',
              },
              '&:hover': {
                bgcolor: 'background.paper',
                borderColor: 'primary.light',
              },
              '&.Mui-selected': {
                bgcolor: 'background.paper',
                borderColor: 'primary.main',
                // Inset outline keeps the ring visible inside the scroll box.
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '-2px',
                '&:hover': {
                  bgcolor: 'background.paper',
                  borderColor: 'primary.main',
                },
              },
            }}
          >
            <StylePreviewThumb previewUrl={option.previewUrl} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: workspaceSpace.xxs,
                px: workspaceSpace.sm,
                py: workspaceSpace.xxs,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                noWrap
                sx={{
                  fontWeight: selected ? 600 : 500,
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
              >
                {option.label}
              </Typography>
              {selected ? (
                <CheckIcon
                  sx={{ fontSize: workspaceIconSize.sm, color: 'primary.main', flexShrink: 0 }}
                />
              ) : null}
            </Box>
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )
})

function StylePreviewThumb({ previewUrl }: { previewUrl?: string }) {
  const [failed, setFailed] = useState(false)
  const showImage = !!previewUrl && !failed

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: previewCardAspectRatio,
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={previewUrl}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'text.disabled',
          }}
        >
          <ImageOutlinedIcon sx={{ fontSize: workspaceIconSize.lg }} />
        </Box>
      )}
    </Box>
  )
}
