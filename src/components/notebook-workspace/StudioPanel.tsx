import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import { Box, Divider, IconButton, Paper, Stack, Typography } from '@mui/material'
import { panelTitleSx, panelTitleVariant } from './panelStyles'
import { subtleScrollbarSx } from './scrollbar'

interface StudioPanelProps {
  onCollapse: () => void
}

export function StudioPanel({ onCollapse }: StudioPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant={panelTitleVariant} sx={panelTitleSx}>
          Studio Panel
        </Typography>
        <IconButton
          size="small"
          color="default"
          aria-label="收起右侧面板"
          onClick={onCollapse}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
        >
          <KeyboardDoubleArrowRightIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        暂未启用
      </Typography>

      <Divider sx={{ my: 1.5 }} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          ...subtleScrollbarSx,
        }}
      >
        <Box
          sx={{
            minHeight: 180,
            height: '100%',
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            px: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Studio 区域占位中，后续再接入内容。
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}
