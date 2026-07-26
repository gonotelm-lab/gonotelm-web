export type WorkspaceMobilePanel = 'sources' | 'chat' | 'studio'

export const workspaceMobilePanelDefault: WorkspaceMobilePanel = 'chat'

export const workspaceMobilePanelLabels: Record<WorkspaceMobilePanel, string> = {
  sources: '来源',
  chat: '对话',
  studio: 'Studio',
}
