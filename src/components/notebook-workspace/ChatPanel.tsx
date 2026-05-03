import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import {
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

interface ChatPanelProps {
  sourcesPanelCollapsed: boolean
  insightsPanelCollapsed: boolean
  onExpandSourcesPanel: () => void
  onExpandInsightsPanel: () => void
}

export function ChatPanel({
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
}: ChatPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minHeight: 620, position: 'relative' }}>
      {sourcesPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label="展开来源面板"
          onClick={onExpandSourcesPanel}
          sx={{
            position: 'absolute',
            left: -18,
            top: 18,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 1,
            '&:hover': { bgcolor: 'background.default' },
          }}
        >
          <KeyboardDoubleArrowRightIcon fontSize="small" />
        </IconButton>
      )}
      {insightsPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label="展开右侧面板"
          onClick={onExpandInsightsPanel}
          sx={{
            position: 'absolute',
            right: -18,
            top: 18,
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 1,
            '&:hover': { bgcolor: 'background.default' },
          }}
        >
          <KeyboardDoubleArrowLeftIcon fontSize="small" />
        </IconButton>
      )}
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Chat
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        模仿 NotebookLM 的对话区布局，等待后端 chat/citation 接口接入。
      </Typography>

      <Stack spacing={2} sx={{ mt: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary">
            问题示例：请总结这个 notebook 的核心观点，并给出可追溯引用。
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2">
            这里将显示模型回答与 citations 跳转卡片（后续接口对接）。
          </Typography>
        </Paper>
        <TextField
          disabled
          placeholder="等待 chat API 接入后可输入问题..."
          size="small"
          fullWidth
        />
      </Stack>
    </Paper>
  )
}
