import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Card,
  CardActionArea,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'

interface NotebookCardProps {
  title: string
  description: string
  dateLabel: string
  sourceCount: number
  onOpen: () => void
}

export function NotebookCard({
  title,
  description,
  dateLabel,
  sourceCount,
  onOpen,
}: NotebookCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: 168,
        borderRadius: 2,
        borderColor: 'divider',
        bgcolor: '#fbfcff',
      }}
    >
      <CardActionArea onClick={onOpen} sx={{ px: 1.75, py: 1.5, height: '100%' }}>
        <Stack
          sx={{
            minHeight: 136,
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 2.4em) minmax(0, 2.75em) auto',
            rowGap: 1,
            alignItems: 'start',
          }}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'start', minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: '#d9edff',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              📘
            </Box>
            <IconButton
              size="small"
              aria-label="笔记本操作（占位）"
              disabled
              sx={{ mt: -0.25, mr: -0.75 }}
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.35,
            }}
          >
            {description}
          </Typography>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              {sourceCount} sources
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', pl: 1 }}>
              {dateLabel}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  )
}
