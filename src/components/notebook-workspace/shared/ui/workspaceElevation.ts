import type { Theme } from '@mui/material/styles'

/**
 * 浮起（阴影）语义 token。
 *
 * 与 `workspaceColorPalette` 一样按主题模式成对提供：浅色下用低透明度的冷灰投影，
 * 深色下界面本身已经很暗，只能靠「更深、更大范围」的投影表达层级，所以 alpha 明显更高。
 * 由 `app/theme.ts` 挂到 `theme.workspaceElevation` 上，组件只读 token、不写死 rgba。
 */
export interface WorkspaceElevation {
  /** 发丝级浮起：卡片 hover、小控件。 */
  soft: string
  /** 菜单 / 弹层。 */
  menu: string
  /** 面板级浮起：悬浮面板、弹出输入区。 */
  panel: string
  /** 消息气泡（带品牌绿倾向）。 */
  message: string
  /** 卡片正面（普通 / 覆盖层）。 */
  card: string
  cardRaised: string
  /** 卡片背面：比正面略重以区分正反。 */
  cardBack: string
  cardBackRaised: string
  /** 小元素浮起：缩略图（选中）、悬浮小控件。 */
  raised: string
  /** 缩略图未选中：只留一点分离感。 */
  raisedMuted: string
}

export const workspaceElevation: WorkspaceElevation = {
  soft: '0 1px 2px rgba(28, 42, 34, 0.06)',
  menu: '0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 14px rgba(15, 23, 42, 0.12)',
  panel: '0 4px 14px rgba(36, 86, 63, 0.16)',
  message: '0 8px 24px rgba(36, 86, 63, 0.2)',
  card: '0 8px 22px rgba(15, 23, 42, 0.1)',
  cardBack: '0 8px 22px rgba(15, 23, 42, 0.12)',
  cardRaised: '0 18px 48px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)',
  cardBackRaised: '0 18px 48px rgba(15, 23, 42, 0.2), 0 4px 12px rgba(15, 23, 42, 0.1)',
  raised: '0 2px 8px rgba(15, 23, 42, 0.12)',
  raisedMuted: '0 1px 2px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.08)',
}

export const workspaceElevationDark: WorkspaceElevation = {
  // 表面提亮后同一 alpha 的黑投影看起来会更重，所以整体收了一档。
  soft: '0 1px 2px rgba(0, 0, 0, 0.4)',
  menu: '0 2px 6px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.46)',
  panel: '0 6px 18px rgba(0, 0, 0, 0.38)',
  message: '0 10px 28px rgba(0, 0, 0, 0.44)',
  card: '0 10px 26px rgba(0, 0, 0, 0.38)',
  cardBack: '0 10px 26px rgba(0, 0, 0, 0.44)',
  cardRaised: '0 22px 56px rgba(0, 0, 0, 0.52), 0 6px 16px rgba(0, 0, 0, 0.36)',
  cardBackRaised: '0 22px 56px rgba(0, 0, 0, 0.56), 0 6px 16px rgba(0, 0, 0, 0.4)',
  raised: '0 2px 10px rgba(0, 0, 0, 0.46)',
  raisedMuted: '0 2px 6px rgba(0, 0, 0, 0.38), 0 4px 12px rgba(0, 0, 0, 0.32)',
}

/**
 * 取当前主题的浮起 token。
 *
 * 主题没挂 `workspaceElevation` 时（MUI 默认主题 / 手搓主题的测试渲染）回落到浅色一套，
 * 与 `scrollbar.ts` 对 `workspacePalette` 的兜底是同一个约定。
 */
export const resolveWorkspaceElevation = (theme: Theme): WorkspaceElevation =>
  theme.workspaceElevation ?? workspaceElevation
