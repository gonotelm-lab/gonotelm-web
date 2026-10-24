import type { MouseEvent, ReactElement } from 'react'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ListNotebooksScope } from '@/types/api'
import {
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../notebook-workspace/shared/ui/typeTokens'

interface HomeScopeSelectorProps {
  value: ListNotebooksScope
  onChange: (value: ListNotebooksScope) => void
}

const SCOPE_OPTIONS: readonly {
  id: ListNotebooksScope
  icon: ReactElement
}[] = [
  { id: 'owned', icon: <PersonOutlineOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} /> },
  { id: 'shared', icon: <GroupOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} /> },
]

/** 首页列表范围：我的 / 共享给我。两者互斥，后端一次只返回一边。 */
export function HomeScopeSelector({ value, onChange }: HomeScopeSelectorProps) {
  const { t } = useTranslation('home')

  const handleScopeChange = (
    _event: MouseEvent<HTMLElement>,
    nextScope: ListNotebooksScope | null,
  ) => {
    if (nextScope) {
      onChange(nextScope)
    }
  }

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={handleScopeChange}
      aria-label={t('scope.aria')}
      sx={{
        display: 'inline-grid',
        gridAutoFlow: 'column',
        gap: workspaceSpace.xxs,
        border: 'none',
        '& .MuiToggleButtonGroup-grouped': {
          width: 34,
          height: 34,
          margin: 0,
          p: 0,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: `${workspaceRadius.md} !important`,
          color: 'text.secondary',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'transparent',
          },
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            borderColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
        },
        // 分离圆角按钮：关掉 Group 默认负 margin；后项左边框必须显式带色，否则 `1px solid` 会落成黑线。
        '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
          marginLeft: 0,
          borderLeft: '1px solid',
          borderLeftColor: 'divider',
          '&.Mui-selected': {
            borderLeftColor: 'primary.main',
          },
        },
      }}
    >
      {SCOPE_OPTIONS.map((option) => {
        const label = t(`scope.${option.id}`)
        return (
          <ToggleButton
            key={option.id}
            value={option.id}
            aria-label={label}
            data-testid={`home-scope-${option.id}`}
          >
            {/* Tooltip 放在 ToggleButton 内，避免打断 ToggleButtonGroup 的直接子节点约定。 */}
            <Tooltip title={label} arrow placement="top" enterDelay={240}>
              <Box component="span" sx={{ display: 'inline-flex', lineHeight: 0 }}>
                {option.icon}
              </Box>
            </Tooltip>
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )
}
