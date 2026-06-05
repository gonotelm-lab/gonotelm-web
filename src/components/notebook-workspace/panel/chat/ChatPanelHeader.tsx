import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { panelTitleSx, panelTitleVariant } from '../../shared/ui/panelStyles'

const chatHeaderStackSpacing = 0.5
const sidePanelToggleButtonTokens = {
  horizontalOffset: -18,
  topOffset: 18,
  zIndex: 1,
}

interface ChatPanelHeaderProps {
  sourcesPanelCollapsed: boolean
  insightsPanelCollapsed: boolean
  hasChatId: boolean
  isClearingContext: boolean
  isStreaming: boolean
  onExpandSourcesPanel: () => void
  onExpandInsightsPanel: () => void
  onClearCurrentContext: () => void
  onOpenSettingsDialog: () => void
  rightContentPadding: number
}

export function ChatPanelHeader({
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  hasChatId,
  isClearingContext,
  isStreaming,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
  onClearCurrentContext,
  onOpenSettingsDialog,
  rightContentPadding,
}: ChatPanelHeaderProps) {
  return (
    <>
      {sourcesPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label="展开来源面板"
          onClick={onExpandSourcesPanel}
          sx={{
            position: 'absolute',
            left: sidePanelToggleButtonTokens.horizontalOffset,
            top: sidePanelToggleButtonTokens.topOffset,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: sidePanelToggleButtonTokens.zIndex,
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
            right: sidePanelToggleButtonTokens.horizontalOffset,
            top: sidePanelToggleButtonTokens.topOffset,
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: sidePanelToggleButtonTokens.zIndex,
            '&:hover': { bgcolor: 'background.default' },
          }}
        >
          <KeyboardDoubleArrowLeftIcon fontSize="small" />
        </IconButton>
      )}

      <Stack
        direction="row"
        spacing={chatHeaderStackSpacing}
        sx={{
          pr: rightContentPadding,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant={panelTitleVariant} sx={panelTitleSx}>
          对话
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Tooltip title="刷新会话上下文">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshRoundedIcon className="chat-refresh-icon" sx={{ fontSize: 15 }} />}
                onClick={onClearCurrentContext}
                disabled={!hasChatId || isClearingContext || isStreaming}
                sx={{
                  minWidth: 0,
                  height: 28,
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontSize: 12.5,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  '& .chat-refresh-icon': {
                    transformOrigin: 'center',
                    animation: isClearingContext ? 'chat-refresh-spin 0.9s linear infinite' : 'none',
                  },
                  '@keyframes chat-refresh-spin': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                  },
                }}
              >
                刷新
              </Button>
            </span>
          </Tooltip>
          <IconButton size="small" aria-label="打开对话设置" onClick={onOpenSettingsDialog}>
            <TuneRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </>
  )
}
