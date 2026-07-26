import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Button } from '@mui/material'
import {
  workspaceRadius,
  workspaceSpace,
} from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize, workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

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
      startIcon={<AddRoundedIcon sx={{ fontSize: workspaceIconSize.sm }} />}
      sx={{
        minWidth: 80,
        height: 34,
        px: workspaceSpace.md,
        borderRadius: workspaceRadius.md,
        fontSize: workspaceType.sm,
        lineHeight: 1.2,
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
