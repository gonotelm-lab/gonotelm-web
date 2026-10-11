import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import { IconButton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { workspaceSpace } from '../../shared/ui/layoutTokens'
import { panelTitleSx, panelTitleVariant } from '../../shared/ui/panelStyles'

const chatHeaderStackSpacing = workspaceSpace.xxs
/**
 * 面板内的刷新 / 设置按钮移到顶栏后，标题行仍保持原来 `size="small"` IconButton 的 30px 高，
 * 三栏面板的正文起点不下移。
 */
const chatHeaderRowMinHeight = 30
const sidePanelToggleButtonTokens = {
  horizontalOffset: -18,
  topOffset: 18,
  zIndex: 1,
}

/**
 * 对话面板头部只留标题 + 两侧面板收展手柄。
 * “刷新对话 / 配置对话”已上移到顶栏的“更多选项”菜单，面板内不再重复放按钮。
 */
interface ChatPanelHeaderProps {
  sourcesPanelCollapsed: boolean
  insightsPanelCollapsed: boolean
  onExpandSourcesPanel: () => void
  onExpandInsightsPanel: () => void
}

export function ChatPanelHeader({
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
}: ChatPanelHeaderProps) {
  const { t } = useTranslation('chat')

  return (
    <>
      {sourcesPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label={t('chat:panel.expandSourcesAria')}
          onClick={onExpandSourcesPanel}
          sx={{
            position: 'absolute',
            left: sidePanelToggleButtonTokens.horizontalOffset,
            top: sidePanelToggleButtonTokens.topOffset,
            display: { xs: 'none', md: 'inline-flex' },
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
          aria-label={t('chat:panel.expandStudioAria')}
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
          minHeight: chatHeaderRowMinHeight,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant={panelTitleVariant} sx={panelTitleSx}>
          {t('chat:panel.title')}
        </Typography>
      </Stack>
    </>
  )
}
