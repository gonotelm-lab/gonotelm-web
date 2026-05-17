import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material'

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
        <Stack sx={{ minHeight: 136, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  bgcolor: '#d9edff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 18,
                }}
              >
                📘
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {title}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                pl: 1,
              }}
            >
              {sourceCount} sources
            </Typography>
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25 }}>
            {dateLabel}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  )
}
