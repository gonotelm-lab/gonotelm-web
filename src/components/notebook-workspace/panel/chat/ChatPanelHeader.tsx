import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { workspaceSpace } from '../../shared/ui/layoutTokens'
import { panelTitleSx, panelTitleVariant } from '../../shared/ui/panelStyles'

const chatHeaderStackSpacing = workspaceSpace.xxs
/**
 * 面板内的刷新 / 设置按钮移到顶栏后，标题行仍保持原来 `size="small"` IconButton 的 30px 高，
 * 三栏面板的正文起点不下移。
 */
const chatHeaderRowMinHeight = 30

/**
 * 对话面板头部只留标题。
 * Sources / Studio 折叠后的展开入口在各自 collapsed rail 内，避免双按钮并存。
 * “刷新对话 / 配置对话”已上移到顶栏的“更多选项”菜单，面板内不再重复放按钮。
 */
interface ChatPanelHeaderProps {
  /** @deprecated 展开入口已迁到 SourcesCollapsedRail。 */
  sourcesPanelCollapsed?: boolean
  /** @deprecated 展开入口已迁到 StudioCollapsedRail。 */
  insightsPanelCollapsed?: boolean
  /** @deprecated 见 sourcesPanelCollapsed。 */
  onExpandSourcesPanel?: () => void
  /** @deprecated 见 insightsPanelCollapsed。 */
  onExpandInsightsPanel?: () => void
}

export function ChatPanelHeader(_props: ChatPanelHeaderProps) {
  const { t } = useTranslation('chat')

  return (
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
  )
}
