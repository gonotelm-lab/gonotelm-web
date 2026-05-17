import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import type { ListNotebooksSortBy } from '@/types/api'
import { createNotebook, listNotebooks } from '../api/notebook'
import { CreateNotebookDialog } from '../components/home/CreateNotebookDialog'
import { CreateNotebookEntry } from '../components/home/CreateNotebookEntry'
import { HomeSortSelector } from '../components/home/HomeSortSelector'
import { NotebookCard } from '../components/home/NotebookCard'
import { buildCreateNotebookRequest } from './home/createNotebookRequest'
import { toNotebookCardViewModel } from './home/notebookCardViewModel'

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sortBy, setSortBy] = useState<ListNotebooksSortBy>('create_time')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createNotebookNameDraft, setCreateNotebookNameDraft] = useState('')
  const [createNotebookErrorMessage, setCreateNotebookErrorMessage] = useState<string | null>(
    null,
  )

  const notebooksQuery = useQuery({
    queryKey: ['notebooks', 'home', { sortBy }],
    queryFn: () => listNotebooks({ limit: 50, offset: 0, sortBy }),
  })

  const createNotebookMutation = useMutation({
    mutationFn: createNotebook,
  })

  const notebookItems = notebooksQuery.data?.notebooks ?? []

  const handleOpenCreateDialog = () => {
    setCreateNotebookErrorMessage(null)
    setIsCreateDialogOpen(true)
  }

  const handleCloseCreateDialog = () => {
    if (createNotebookMutation.isPending) {
      return
    }
    setCreateNotebookErrorMessage(null)
    setCreateNotebookNameDraft('')
    setIsCreateDialogOpen(false)
  }

  const handleCreateNotebook = async (mode: 'with-name' | 'later') => {
    setCreateNotebookErrorMessage(null)

    try {
      const payload = buildCreateNotebookRequest(createNotebookNameDraft, mode)
      const result = await createNotebookMutation.mutateAsync(payload)

      setIsCreateDialogOpen(false)
      setCreateNotebookNameDraft('')
      void queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
      navigate(`/notebook/${result.id}`)
    } catch (error) {
      // 保留输入和弹窗上下文，让用户可直接重试。
      if (error instanceof Error && error.message.trim()) {
        setCreateNotebookErrorMessage(error.message)
        return
      }
      setCreateNotebookErrorMessage('创建失败，请稍后重试')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h6">我的笔记本</Typography>
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        />
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <CreateNotebookEntry
            onClick={handleOpenCreateDialog}
            disabled={createNotebookMutation.isPending}
            size="small"
          />
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {notebooksQuery.isFetching && <CircularProgress size={14} />}
            <HomeSortSelector value={sortBy} onChange={setSortBy} />
          </Stack>
        </Stack>

        {notebooksQuery.isLoading ? (
          <Stack sx={{ py: 2, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notebookItems.length === 0 ? null : (
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {notebookItems.map((notebook) => {
              const viewModel = toNotebookCardViewModel(notebook)
              return (
                <NotebookCard
                  key={viewModel.id}
                  title={viewModel.title}
                  description={viewModel.description}
                  sourceCount={viewModel.sourceCount}
                  dateLabel={viewModel.dateLabel}
                  onOpen={() => navigate(`/notebook/${viewModel.id}`)}
                />
              )
            })}
          </Box>
        )}
      </Stack>
      <CreateNotebookDialog
        open={isCreateDialogOpen}
        draftName={createNotebookNameDraft}
        submitting={createNotebookMutation.isPending}
        errorMessage={createNotebookErrorMessage}
        onDraftNameChange={setCreateNotebookNameDraft}
        onClose={handleCloseCreateDialog}
        onCreateWithName={() => {
          void handleCreateNotebook('with-name')
        }}
      />
    </Container>
  )
}
