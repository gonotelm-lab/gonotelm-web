import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import {
  headerMenuItemSx,
  headerMenuPaperSx,
} from '../../../shared/ui/menuStyles'
import { workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceIconSize, workspaceType } from '../../../shared/ui/typeTokens'
import type { SourceSortBy } from '../sortSourceListItems'

const SORT_OPTIONS: readonly SourceSortBy[] = ['recent', 'title', 'type']

interface SourceSortMenuProps {
  value: SourceSortBy
  onChange: (value: SourceSortBy) => void
}

export const SourceSortMenu = memo(function SourceSortMenu({
  value,
  onChange,
}: SourceSortMenuProps) {
  const { t } = useTranslation('sources')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton
        data-testid="sources-sort"
        size="small"
        aria-label={t('panel.sort.aria')}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          p: 0.25,
          flexShrink: 0,
          color: 'text.secondary',
        }}
      >
        <SortRoundedIcon sx={{ fontSize: workspaceIconSize.md }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        elevation={0}
        slotProps={{ paper: { sx: headerMenuPaperSx } }}
      >
        {SORT_OPTIONS.map((option) => {
          const selected = option === value
          return (
            <MenuItem
              key={option}
              data-testid={`sources-sort-${option}`}
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
                {t(`panel.sort.${option}`)}
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
})
