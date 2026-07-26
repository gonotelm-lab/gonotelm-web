import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Button } from '@mui/material'
import {
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'

interface CreateNotebookEntryProps {
  onClick: () => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'contained' | 'outlined' | 'text'
}

export function CreateNotebookEntry({
  onClick,
  disabled = false,
  size = 'medium',
  variant = 'contained',
}: CreateNotebookEntryProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size={size}
      variant={variant}
      startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
      sx={{
        minWidth: 72,
        height: 30,
        px: workspaceSpace.sm,
        borderRadius: workspaceRadius.md,
        fontSize: 12,
        lineHeight: 1.15,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        '& .MuiButton-startIcon': {
          marginRight: workspaceSpace.xxs,
          marginLeft: 0,
        },
      }}
    >
      新增
    </Button>
  )
}
