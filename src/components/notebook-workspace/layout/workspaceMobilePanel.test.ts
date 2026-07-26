import { describe, expect, it } from 'vitest'
import {
  workspaceMobilePanelDefault,
  workspaceMobilePanelLabels,
  type WorkspaceMobilePanel,
} from './workspaceMobilePanel'

describe('workspaceMobilePanel', () => {
  it('defaults to chat', () => {
    expect(workspaceMobilePanelDefault).toBe('chat')
  })

  it('exposes Chinese labels for all panels', () => {
    const panels: WorkspaceMobilePanel[] = ['sources', 'chat', 'studio']
    for (const panel of panels) {
      expect(workspaceMobilePanelLabels[panel].length).toBeGreaterThan(0)
    }
    expect(workspaceMobilePanelLabels.sources).toBe('来源')
    expect(workspaceMobilePanelLabels.chat).toBe('对话')
    expect(workspaceMobilePanelLabels.studio).toBe('Studio')
  })
})
