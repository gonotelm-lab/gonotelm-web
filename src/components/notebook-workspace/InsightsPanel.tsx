import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import { Box, Divider, IconButton, Paper, Stack, Typography } from '@mui/material'

interface InsightsPanelProps {
  onCollapse: () => void
}

export function InsightsPanel({ onCollapse }: InsightsPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Insights
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
          minHeight: 180,
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
          Insight 区域占位中，后续再接入内容。
        </Typography>
      </Box>
    </Paper>
  )
}
