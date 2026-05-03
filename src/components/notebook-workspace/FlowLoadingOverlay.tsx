import { Box } from '@mui/material'

interface FlowLoadingOverlayProps {
  active: boolean
  rgbColor?: string
  peakOpacity?: number
  durationMs?: number
}

export function FlowLoadingOverlay({
  active,
  rgbColor = '30, 136, 229',
  peakOpacity = 0.14,
  durationMs = 1500,
}: FlowLoadingOverlayProps) {
  if (!active) return null

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `linear-gradient(90deg, rgba(${rgbColor}, 0) 0%, rgba(${rgbColor}, ${peakOpacity}) 48%, rgba(${rgbColor}, 0) 100%)`,
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
