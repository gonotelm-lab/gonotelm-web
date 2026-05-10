import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Box,
  CircularProgress,
  IconButton,
  InputBase,
} from '@mui/material'
import { Link } from 'react-router-dom'

interface WorkspaceHeaderProps {
  notebookName: string
  isFetching: boolean
  isUpdatingName: boolean
  onNotebookNameChange: (value: string) => void
  onNotebookNameFocus: () => void
  onNotebookNameBlur: () => void
}

export function WorkspaceHeader({
  notebookName,
  isFetching,
  isUpdatingName,
  onNotebookNameChange,
  onNotebookNameFocus,
  onNotebookNameBlur,
}: WorkspaceHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: '100%',
          px: { xs: 0.75, md: 1 },
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <IconButton
          component={Link}
          to="/"
          edge="start"
          color="inherit"
          size="small"
          aria-label="返回"
          sx={{ ml: 0, p: 0.5 }}
        >
          <ArrowBackIcon sx={{ fontSize: '0.95rem' }} />
        </IconButton>
        <InputBase
          value={notebookName}
          placeholder="Untitled notebook"
          onChange={(event) => onNotebookNameChange(event.target.value)}
          onFocus={onNotebookNameFocus}
          onBlur={onNotebookNameBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const input = event.target as HTMLInputElement
              input.blur()
            }
          }}
          inputProps={{
            'aria-label': '笔记名称',
            maxLength: 128,
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: { xs: '100%', md: 560 },
            px: 1.1,
            py: 0.25,
            borderRadius: 1,
            cursor: 'text',
            fontSize: '0.95rem',
            lineHeight: 1.35,
            fontWeight: 500,
            '& input': {
              cursor: 'text',
              textOverflow: 'ellipsis',
            },
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '&.Mui-focused': {
              bgcolor: 'action.selected',
            },
          }}
        />
        {(isFetching || isUpdatingName) && <CircularProgress size={16} sx={{ ml: 1 }} />}
      </Box>
    </Box>
  )
}
