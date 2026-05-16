export type ChatStyleOption = 'default' | 'analyst' | 'guide' | 'custom'
export type ChatAnswerLengthOption = 'default' | 'longer' | 'shorter'

export const chatStyleOptionList: { value: ChatStyleOption; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'analyst', label: '分析师' },
  { value: 'guide', label: '向导' },
  { value: 'custom', label: '自定义' },
]

export const chatAnswerLengthOptionList: { value: ChatAnswerLengthOption; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'longer', label: '更长' },
  { value: 'shorter', label: '更短' },
]

export const settingsToggleButtonSx = {
  minWidth: 72,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 999,
  margin: 0,
  px: 1.25,
  py: 0.35,
  textTransform: 'none',
  fontSize: 12.5,
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
}
