import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'

interface WorkspaceHeaderProps {
  notebookName: string
  isFetching: boolean
}

export function WorkspaceHeader({ notebookName, isFetching }: WorkspaceHeaderProps) {
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', backgroundImage: 'none' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton component={Link} to="/" edge="start" color="inherit" aria-label="返回">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="caption" color="text.secondary">
            GoNoteLM Workspace
          </Typography>
          <Typography variant="h6">{notebookName}</Typography>
        </Box>
        {isFetching && <CircularProgress size={16} sx={{ ml: 1 }} />}
      </Toolbar>
    </AppBar>
  )
}
