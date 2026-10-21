import type { MouseEvent } from 'react'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ListNotebooksScope } from '@/types/api'
import {
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

interface HomeScopeSelectorProps {
  value: ListNotebooksScope
  onChange: (value: ListNotebooksScope) => void
}

const SCOPE_OPTIONS: ListNotebooksScope[] = ['owned', 'shared']

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
        gridAutoColumns: '1fr',
        gap: workspaceSpace.xxs,
        border: 'none',
        '& .MuiToggleButtonGroup-grouped': {
          height: 34,
          margin: 0,
          px: workspaceSpace.md,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: `${workspaceRadius.md} !important`,
          color: 'text.secondary',
          fontSize: workspaceType.sm,
          fontWeight: 500,
          lineHeight: 1.2,
          textTransform: 'none',
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
        '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
          marginLeft: 0,
          borderLeft: '1px solid',
        },
      }}
    >
      {SCOPE_OPTIONS.map((scope) => (
        <ToggleButton key={scope} value={scope} aria-label={t(`scope.${scope}`)}>
          {t(`scope.${scope}`)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
