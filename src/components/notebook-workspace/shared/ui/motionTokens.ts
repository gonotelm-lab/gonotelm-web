export const workspaceMotion = {
  easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  durationFastMs: 120,
  durationBaseMs: 180,
  durationPanelMs: 240,
  durationExitMs: 240,
} as const

export const workspaceAnimation = {
  flowLoadingWaveDurationMs: 1500,
  refreshSpinDurationMs: 1200,
  pendingEllipsisDurationMs: 1600,
  streamStatusFlowDurationSec: 3.1,
  mindmapViewportDurationMs: 240,
  mindmapViewportEasing: 'easeInOutQuad',
} as const

export const workspaceTransitionPresets = {
  colorOnly: `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
  backgroundOnly: `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
  opacityOnly: `opacity ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
  colorBorderBg:
    `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
    `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
    `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
  colorBorderBgWithTransform:
    `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
    `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
    `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
    `transform ${workspaceMotion.durationFastMs}ms ${workspaceMotion.easingStandard}`,
  borderBg:
    `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}, ` +
    `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
  panelTransform: `transform ${workspaceMotion.durationPanelMs}ms ${workspaceMotion.easingStandard}`,
  panelWidth: `width ${workspaceMotion.durationPanelMs}ms ${workspaceMotion.easingStandard}`,
  panelGridColumns:
    `grid-template-columns ${workspaceMotion.durationPanelMs}ms ${workspaceMotion.easingStandard}`,
  panelTransformWithFade:
    `transform ${workspaceMotion.durationPanelMs}ms ${workspaceMotion.easingStandard}, ` +
    `opacity ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
} as const

