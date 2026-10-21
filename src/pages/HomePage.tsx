import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ListNotebooksScope, ListNotebooksSortBy } from '@/types/api'
import { createNotebook, deleteNotebook, listNotebooks } from '../api/notebook'
import { apiErrorMessage } from '../lib/apiErrorMessage'
import { AccountMenu } from '../components/auth/AccountMenu'
import { BrandMark } from '../components/brand/BrandMark'
import { CreateNotebookDialog } from '../components/home/CreateNotebookDialog'
import { CreateNotebookEntry } from '../components/home/CreateNotebookEntry'
import { HomeScopeSelector } from '../components/home/HomeScopeSelector'
import { HomeSortSelector } from '../components/home/HomeSortSelector'
import { NotebookCard } from '../components/home/NotebookCard'
import {
  workspaceLayout,
  workspaceSpace,
} from '../components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../components/notebook-workspace/shared/ui/motionTokens'
import { buildCreateNotebookRequest } from './home/createNotebookRequest'
import { toNotebookCardViewModel } from './home/notebookCardViewModel'

/** Home header mirrors the workspace chrome so the account trigger matches across pages. */
const homeHeaderChrome = {
  rowMinHeight: 48,
  controlHeight: 36,
  avatarSize: 32,
} as const

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('home')
  const [scope, setScope] = useState<ListNotebooksScope>('owned')
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
    queryKey: ['notebooks', 'home', { sortBy, scope }],
    queryFn: () => listNotebooks({ limit: 50, offset: 0, sortBy, scope }),
    // 切换范围时保留上一份列表，避免列表区域先塌陷成 loading 再展开。
    placeholderData: keepPreviousData,
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
      setCreateDialogState((prev) => ({
        ...prev,
        errorMessage: apiErrorMessage(error, 'home:create.failed'),
      }))
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
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: homeHeaderChrome.rowMinHeight,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <BrandMark />
            <Typography variant="h6">GoNoteLM</Typography>
          </Stack>
          <AccountMenu
            triggerSize={homeHeaderChrome.controlHeight}
            avatarSize={homeHeaderChrome.avatarSize}
          />
        </Stack>
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
        </Stack>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: workspaceLayout.listInlineGap,
          }}
        >
          <HomeScopeSelector value={scope} onChange={setScope} />
          <Stack
            direction="row"
            spacing={workspaceLayout.listInlineGap}
            sx={{ alignItems: 'center', ml: 'auto' }}
          >
            {notebooksQuery.isFetching && <CircularProgress size={14} color="primary" />}
            <HomeSortSelector value={sortBy} onChange={setSortBy} />
          </Stack>
        </Stack>

        {notebooksQuery.isLoading ? (
          <Stack sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notebookItems.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: workspaceLayout.panelPaddingY, textAlign: 'center' }}
          >
            {t(scope === 'shared' ? 'empty.shared' : 'empty.owned')}
          </Typography>
        ) : (
          <Box
            aria-busy={notebooksQuery.isFetching}
            sx={{
              display: 'grid',
              gap: workspaceLayout.listRowGap,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              opacity: notebooksQuery.isPlaceholderData ? 0.55 : 1,
              pointerEvents: notebooksQuery.isPlaceholderData ? 'none' : undefined,
              transition: workspaceTransitionPresets.opacityOnly,
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
                  owner={scope === 'shared' ? viewModel.owner : undefined}
                  onOpen={() => navigate(notebookPath)}
                  onDelete={
                    scope === 'shared'
                      ? undefined
                      : () => handleDeleteNotebook(viewModel.id)
                  }
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
