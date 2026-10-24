import type { ElementType } from 'react'
import { useState } from 'react'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import { Box, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ListNotebooksSortBy } from '@/types/api'
import {
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import {
  headerMenuItemSx,
  headerMenuPaperSx,
} from '../notebook-workspace/shared/ui/menuStyles'
import { workspaceIconSize, workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

interface HomeSortSelectorProps {
  value: ListNotebooksSortBy
  onChange: (value: ListNotebooksSortBy) => void
}

const SORT_OPTIONS: readonly {
  id: ListNotebooksSortBy
  Icon: ElementType
}[] = [
  { id: 'last_active', Icon: HistoryRoundedIcon },
  { id: 'create_time', Icon: CalendarMonthRoundedIcon },
]

export function HomeSortSelector({ value, onChange }: HomeSortSelectorProps) {
  const { t } = useTranslation('home')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const selectedOption =
    SORT_OPTIONS.find((option) => option.id === value) ?? SORT_OPTIONS[1]
  const triggerLabel =
    selectedOption.id === 'last_active' ? t('sort.lastActive') : t('sort.createTime')

  return (
    <>
      <Tooltip title={triggerLabel} arrow placement="top" enterDelay={240}>
        <IconButton
          size="small"
          aria-label={t('sort.aria')}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          data-testid="home-sort"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            width: 34,
            height: 34,
            borderRadius: workspaceRadius.md,
            border: '1px solid',
            borderColor: open ? 'primary.main' : 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'transparent',
            },
          }}
        >
          <selectedOption.Icon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        elevation={0}
        slotProps={{ paper: { sx: headerMenuPaperSx } }}
      >
        {SORT_OPTIONS.map((option) => {
          const selected = option.id === value
          const label =
            option.id === 'last_active' ? t('sort.lastActive') : t('sort.createTime')
          const OptionIcon = option.Icon
          return (
            <MenuItem
              key={option.id}
              data-testid={`home-sort-${option.id}`}
              selected={selected}
              onClick={() => {
                onChange(option.id)
                setAnchorEl(null)
              }}
              sx={{
                ...headerMenuItemSx,
                minHeight: 34,
                gap: workspaceSpace.sm,
              }}
            >
              <Box
                sx={{
                  width: workspaceIconSize.md,
                  display: 'inline-flex',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <OptionIcon sx={{ fontSize: workspaceIconSize.md }} />
              </Box>
              <Typography
                component="span"
                sx={{
                  flex: 1,
                  fontSize: workspaceType.sm,
                  lineHeight: 1.2,
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {label}
              </Typography>
              <Box
                sx={{
                  width: workspaceIconSize.md,
                  display: 'inline-flex',
                  justifyContent: 'center',
                }}
              >
                {selected ? (
                  <CheckRoundedIcon
                    sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary' }}
                  />
                ) : null}
              </Box>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
