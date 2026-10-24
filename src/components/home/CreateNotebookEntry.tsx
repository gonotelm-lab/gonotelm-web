import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { workspaceRadius } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../notebook-workspace/shared/ui/typeTokens'

interface CreateNotebookEntryProps {
  onClick: () => void
  disabled?: boolean
  /** @deprecated Kept for call-site compatibility; icon button ignores size. */
  size?: 'small' | 'medium' | 'large'
  /** @deprecated Kept for call-site compatibility; create is always a primary icon. */
  variant?: 'contained' | 'outlined' | 'text'
}

export function CreateNotebookEntry({
  onClick,
  disabled = false,
}: CreateNotebookEntryProps) {
  const { t } = useTranslation('home')
  const label = t('create.entry')

  return (
    <Tooltip title={label} arrow placement="top" enterDelay={240}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          data-testid="home-create-notebook"
          sx={{
            width: 34,
            height: 34,
            borderRadius: workspaceRadius.md,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          }}
        >
          <AddOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
        </IconButton>
      </span>
    </Tooltip>
  )
}
