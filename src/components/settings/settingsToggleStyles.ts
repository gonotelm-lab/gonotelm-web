import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

/**
 * 通用设置里的胶囊选择器（界面语言 / 颜色模式共用一套外观）。
 * 选中态用品牌绿填充 + 反色文字，未选中是发丝描边。
 */
export const settingsPillToggleSx = {
  minWidth: 96,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 999,
  margin: 0,
  px: workspaceSpace.md,
  py: workspaceSpace.xxs,
  textTransform: 'none',
  fontSize: workspaceType.sm,
  '&.MuiToggleButtonGroup-grouped': {
    borderRadius: '999px !important',
    margin: 0,
  },
  '&.MuiToggleButtonGroup-grouped:not(:first-of-type)': {
    borderLeft: '1px solid',
    borderColor: 'divider',
  },
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    borderColor: 'primary.main',
    '&:hover': {
      bgcolor: 'primary.dark',
    },
  },
} as const
