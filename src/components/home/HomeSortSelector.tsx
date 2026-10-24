import { useState } from 'react'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
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

const SORT_OPTIONS: readonly ListNotebooksSortBy[] = ['last_active', 'create_time']

export function HomeSortSelector({ value, onChange }: HomeSortSelectorProps) {
  const { t } = useTranslation('home')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const triggerLabel = t('sort.aria')

  return (
    <>
      <Tooltip title={triggerLabel} arrow placement="top" enterDelay={240}>
        <IconButton
          size="small"
          aria-label={triggerLabel}
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
          <SortRoundedIcon sx={{ fontSize: workspaceIconSize.md }} />
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
          const selected = option === value
          const label =
            option === 'last_active' ? t('sort.lastActive') : t('sort.createTime')
          return (
            <MenuItem
              key={option}
              data-testid={`home-sort-${option}`}
              selected={selected}
              onClick={() => {
                onChange(option)
                setAnchorEl(null)
              }}
              sx={{
                ...headerMenuItemSx,
                minHeight: 34,
                justifyContent: 'space-between',
              }}
            >
              <Typography
                component="span"
                sx={{
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
                  ml: workspaceSpace.md,
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
