import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Button } from '@mui/material'

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
        px: 0.75,
        borderRadius: 1,
        fontSize: 12,
        lineHeight: 1.15,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        '& .MuiButton-startIcon': {
          marginRight: 0.375,
          marginLeft: 0,
        },
      }}
    >
      新增
    </Button>
  )
}
