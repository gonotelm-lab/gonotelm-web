import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardActionArea,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { listNotebooks } from '../api/notebook'

export function HomePage() {
  const navigate = useNavigate()
  const notebooksQuery = useQuery({
    queryKey: ['notebooks', 'home'],
    queryFn: () => listNotebooks({ limit: 50, offset: 0 }),
  })
  const notebookItems = notebooksQuery.data?.notebooks ?? []

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">我的 Notebooks</Typography>
          {notebooksQuery.isFetching && <CircularProgress size={16} />}
        </Stack>

        {notebooksQuery.isLoading ? (
          <Stack sx={{ py: 2, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notebookItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            暂无笔记本
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
            }}
          >
            {notebookItems.map((notebook) => (
              <Card key={notebook.id} variant="outlined" sx={{ borderColor: 'divider', minHeight: 132 }}>
                <CardActionArea onClick={() => navigate(`/notebook/${notebook.id}`)} sx={{ px: 1.5, py: 1.5, height: '100%' }}>
                  <Stack sx={{ minHeight: 102, justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" noWrap sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                        {notebook.name}
                      </Typography>
                      <Box
                        sx={{
                          minWidth: 34,
                          height: 26,
                          px: 1,
                          borderRadius: 999,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                      >
                        {notebook.source_count}
                      </Box>
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 2,
                        fontSize: 15,
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {notebook.desc?.trim() ? notebook.desc : '无描述'}
                    </Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </Stack>
    </Container>
  )
}
