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
import { createNotebook, deleteNotebook, listNotebooks } from '../api/notebook'
import { CreateNotebookDialog } from '../components/home/CreateNotebookDialog'
import { CreateNotebookEntry } from '../components/home/CreateNotebookEntry'
import { HomeSortSelector } from '../components/home/HomeSortSelector'
import { NotebookCard } from '../components/home/NotebookCard'
import {
  workspaceLayout,
  workspaceSpace,
} from '../components/notebook-workspace/shared/ui/layoutTokens'
import { buildCreateNotebookRequest } from './home/createNotebookRequest'
import { toNotebookCardViewModel } from './home/notebookCardViewModel'

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sortBy, setSortBy] = useState<ListNotebooksSortBy>('create_time')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createDialogState, setCreateDialogState] = useState<{
    draftName: string
    errorMessage: string | null
  }>({
    draftName: '',
    errorMessage: null,
  })
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null)

  const notebooksQuery = useQuery({
    queryKey: ['notebooks', 'home', { sortBy }],
    queryFn: () => listNotebooks({ limit: 50, offset: 0, sortBy }),
  })

  const createNotebookMutation = useMutation({
    mutationFn: createNotebook,
  })
  const deleteNotebookMutation = useMutation({
    mutationFn: deleteNotebook,
  })

  const notebookItems = notebooksQuery.data?.notebooks ?? []

  const handleOpenCreateDialog = () => {
    setCreateDialogState((prev) => ({ ...prev, errorMessage: null }))
    setIsCreateDialogOpen(true)
  }

  const handleCloseCreateDialog = () => {
    if (createNotebookMutation.isPending) {
      return
    }
    setCreateDialogState({ draftName: '', errorMessage: null })
    setIsCreateDialogOpen(false)
  }

  const handleCreateNotebook = async (mode: 'with-name' | 'later') => {
    setCreateDialogState((prev) => ({ ...prev, errorMessage: null }))

    try {
      const payload = buildCreateNotebookRequest(createDialogState.draftName, mode)
      const result = await createNotebookMutation.mutateAsync(payload)

      setIsCreateDialogOpen(false)
      setCreateDialogState({ draftName: '', errorMessage: null })
      void queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
      navigate(`/notebook/${result.id}`)
    } catch (error) {
      // 保留输入和弹窗上下文，让用户可直接重试。
      if (error instanceof Error && error.message.trim()) {
        setCreateDialogState((prev) => ({ ...prev, errorMessage: error.message }))
        return
      }
      setCreateDialogState((prev) => ({ ...prev, errorMessage: '创建失败，请稍后重试' }))
    }
  }

  const handleDeleteNotebook = async (notebookId: string) => {
    if (deleteNotebookMutation.isPending) {
      return
    }
    setDeletingNotebookId(notebookId)
    try {
      await deleteNotebookMutation.mutateAsync(notebookId)
      await queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
    } finally {
      setDeletingNotebookId(null)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: workspaceSpace.xl }}>
      <Stack spacing={workspaceLayout.panelPaddingY}>
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
          <Stack
            direction="row"
            spacing={workspaceLayout.listInlineGap}
            sx={{ alignItems: 'center' }}
          >
            {notebooksQuery.isFetching && <CircularProgress size={14} />}
            <HomeSortSelector value={sortBy} onChange={setSortBy} />
          </Stack>
        </Stack>

        {notebooksQuery.isLoading ? (
          <Stack sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notebookItems.length === 0 ? null : (
          <Box
            sx={{
              display: 'grid',
              gap: workspaceLayout.listRowGap,
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
              const notebookPath = `/notebook/${viewModel.id}`
              return (
                <NotebookCard
                  key={viewModel.id}
                  title={viewModel.title}
                  description={viewModel.description}
                  sourceCount={viewModel.sourceCount}
                  dateLabel={viewModel.dateLabel}
                  onOpen={() => navigate(notebookPath)}
                  onDelete={() => handleDeleteNotebook(viewModel.id)}
                  deleting={deleteNotebookMutation.isPending && deletingNotebookId === viewModel.id}
                />
              )
            })}
          </Box>
        )}
      </Stack>
      <CreateNotebookDialog
        open={isCreateDialogOpen}
        draftName={createDialogState.draftName}
        submitting={createNotebookMutation.isPending}
        errorMessage={createDialogState.errorMessage}
        onDraftNameChange={(value) => {
          setCreateDialogState((prev) => ({ ...prev, draftName: value }))
        }}
        onClose={handleCloseCreateDialog}
        onCreateWithName={() => {
          void handleCreateNotebook('with-name')
        }}
      />
    </Container>
  )
}
