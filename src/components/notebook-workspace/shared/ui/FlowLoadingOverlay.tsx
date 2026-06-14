import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { workspaceAnimation } from './motionTokens'

interface FlowLoadingOverlayProps {
  active: boolean
  rgbColor?: string
  peakOpacity?: number
  durationMs?: number
}

export function FlowLoadingOverlay({
  active,
  rgbColor,
  peakOpacity,
  durationMs = workspaceAnimation.flowLoadingWaveDurationMs,
}: FlowLoadingOverlayProps) {
  const theme = useTheme()
  const resolvedRgbColor = rgbColor ?? theme.workspacePalette.flowLoading.rgbColor
  const resolvedPeakOpacity = peakOpacity ?? theme.workspacePalette.flowLoading.peakOpacity

  if (!active) return null

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `linear-gradient(90deg, rgba(${resolvedRgbColor}, 0) 0%, rgba(${resolvedRgbColor}, ${resolvedPeakOpacity}) 48%, rgba(${resolvedRgbColor}, 0) 100%)`,
        backgroundSize: '220% 100%',
        animation: `flow-loading-wave ${durationMs}ms linear infinite`,
        '@keyframes flow-loading-wave': {
          '0%': {
            backgroundPosition: '200% 0',
          },
          '100%': {
            backgroundPosition: '-120% 0',
          },
        },
      }}
    />
  )
}
