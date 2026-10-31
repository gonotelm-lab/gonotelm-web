import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ListNotebooksScope, ListNotebooksSortBy, NotebookSummary } from '@/types/api'
import {
  createNotebook,
  deleteNotebook,
  listNotebooks,
  listPinnedNotebooks,
  pinNotebook,
  unpinNotebook,
} from '../api/notebook'
import { apiErrorMessage } from '../lib/apiErrorMessage'
import { isPinLimitReached } from '../lib/notebookPins'
import { showAppToast } from '../lib/apiErrorToast'
import { useMeQuery } from '../components/auth/useMeQuery'
import { AddToFavouriteDialog } from '../components/favourites/AddToFavouriteDialog'
import { CreateNotebookDialog } from '../components/home/CreateNotebookDialog'
import { CreateNotebookEntry } from '../components/home/CreateNotebookEntry'
import { HomeScopeSelector } from '../components/home/HomeScopeSelector'
import { HomeSortSelector } from '../components/home/HomeSortSelector'
import { NotebookCard } from '../components/home/NotebookCard'
import { AppShellHeader } from '../components/shell/AppShellHeader'
import {
  workspaceLayout,
  workspaceSpace,
} from '../components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../components/notebook-workspace/shared/ui/motionTokens'
import { buildCreateNotebookRequest } from './home/createNotebookRequest'
import { patchHomePreferences, readHomePreferences } from '@/lib/localPreferences'
import { toNotebookCardViewModel } from './home/notebookCardViewModel'
import { getNotebookEmoji } from '../lib/notebookEmoji'

const notebookGridSx = {
  display: 'grid',
  gap: workspaceLayout.listRowGap,
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
} as const

export function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('home')
  const meQuery = useMeQuery()
  const meUserId = meQuery.data?.user_id
  // 首页筛选落在统一 LocalPreferences.home；变更经 patchHomePreferences 落盘。
  const [homePrefs, setHomePrefs] = useState(readHomePreferences)
  const { scope, sortBy } = homePrefs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleScopeChange = (next: ListNotebooksScope) => {
    setHomePrefs(patchHomePreferences({ scope: next }))
  }

  const handleSortChange = (next: ListNotebooksSortBy) => {
    setHomePrefs(patchHomePreferences({ sortBy: next }))
  }
  const [createDialogState, setCreateDialogState] = useState<{
    draftName: string
    errorMessage: string | null
  }>({
    draftName: '',
    errorMessage: null,
  })
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null)
  const [pinningNotebookId, setPinningNotebookId] = useState<string | null>(null)
  const [addToFavouriteNotebookId, setAddToFavouriteNotebookId] = useState<string | null>(
    null,
  )

  const pinsQuery = useQuery({
    queryKey: ['notebooks', 'pins'],
    queryFn: listPinnedNotebooks,
  })

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
  const pinNotebookMutation = useMutation({
    mutationFn: pinNotebook,
  })
  const unpinNotebookMutation = useMutation({
    mutationFn: unpinNotebook,
  })

  const pinnedItems = pinsQuery.data?.notebooks ?? []
  const notebookItems = notebooksQuery.data?.notebooks ?? []
  const pinLimitReached = isPinLimitReached(pinnedItems.length)
  const homeBusy = notebooksQuery.isLoading && pinnedItems.length === 0 && !pinsQuery.isSuccess

  const invalidateHomeLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] }),
      queryClient.invalidateQueries({ queryKey: ['notebooks', 'pins'] }),
    ])
  }

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
      await invalidateHomeLists()
    } finally {
      setDeletingNotebookId(null)
    }
  }

  const handlePinNotebook = async (notebookId: string) => {
    if (pinNotebookMutation.isPending || unpinNotebookMutation.isPending) {
      return
    }
    if (isPinLimitReached(pinnedItems.length)) {
      showAppToast({ messageKey: 'apiError.pinLimit' })
      return
    }
    setPinningNotebookId(notebookId)
    try {
      await pinNotebookMutation.mutateAsync(notebookId)
      await invalidateHomeLists()
    } finally {
      setPinningNotebookId(null)
    }
  }

  const handleUnpinNotebook = async (notebookId: string) => {
    if (pinNotebookMutation.isPending || unpinNotebookMutation.isPending) {
      return
    }
    setPinningNotebookId(notebookId)
    try {
      await unpinNotebookMutation.mutateAsync(notebookId)
      await invalidateHomeLists()
    } finally {
      setPinningNotebookId(null)
    }
  }

  const renderNotebookCard = (
    notebook: NotebookSummary,
    options: {
      showOwner: boolean
      canDelete: boolean
      pinned: boolean
    },
  ) => {
    const viewModel = toNotebookCardViewModel(notebook)
    const notebookPath = `/notebook/${viewModel.id}`
    return (
      <NotebookCard
        key={viewModel.id}
        title={viewModel.title}
        sourceCount={viewModel.sourceCount}
        dateLabel={viewModel.dateLabel}
        isPublic={viewModel.isPublic}
        coverUrl={viewModel.coverUrl}
        emoji={getNotebookEmoji(viewModel.id)}
        owner={options.showOwner ? viewModel.owner : undefined}
        onOpen={() => navigate(notebookPath)}
        onDelete={
          options.canDelete ? () => handleDeleteNotebook(viewModel.id) : undefined
        }
        onPin={options.pinned ? undefined : () => handlePinNotebook(viewModel.id)}
        onUnpin={options.pinned ? () => handleUnpinNotebook(viewModel.id) : undefined}
        onAddToFavourite={() => setAddToFavouriteNotebookId(viewModel.id)}
        deleting={deleteNotebookMutation.isPending && deletingNotebookId === viewModel.id}
        pinning={
          (pinNotebookMutation.isPending || unpinNotebookMutation.isPending) &&
          pinningNotebookId === viewModel.id
        }
        pinDisabled={!options.pinned && pinLimitReached}
      />
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: workspaceSpace.xl }}>
      <Stack spacing={workspaceLayout.panelPaddingY}>
        <AppShellHeader />
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        />

        {/* 置顶区独立于 scope，放在筛选条上方。 */}
        {!pinsQuery.isLoading && pinnedItems.length > 0 ? (
          <Stack spacing={workspaceLayout.listRowGap}>
            <Tooltip title={t('pinned.title')} placement="top">
              <PushPinOutlinedIcon
                aria-label={t('pinned.title')}
                sx={{
                  fontSize: 18,
                  color: 'text.secondary',
                  transform: 'rotate(45deg)',
                }}
              />
            </Tooltip>
            <Box sx={notebookGridSx}>
              {pinnedItems.map((notebook) => {
                const isOwned =
                  Boolean(meUserId) && notebook.owner?.user_id === meUserId
                const showOwner = Boolean(notebook.owner) && !isOwned
                return renderNotebookCard(notebook, {
                  showOwner,
                  canDelete: isOwned || (!notebook.owner && scope === 'owned'),
                  pinned: true,
                })
              })}
            </Box>
          </Stack>
        ) : null}

        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: workspaceLayout.listInlineGap,
          }}
        >
          <HomeScopeSelector value={scope} onChange={handleScopeChange} />
          <Stack
            direction="row"
            spacing={workspaceLayout.listInlineGap}
            sx={{ alignItems: 'center', ml: 'auto' }}
          >
            {(notebooksQuery.isFetching || pinsQuery.isFetching) && (
              <CircularProgress size={14} color="primary" />
            )}
            <HomeSortSelector value={sortBy} onChange={handleSortChange} />
            <CreateNotebookEntry
              onClick={handleOpenCreateDialog}
              disabled={createNotebookMutation.isPending}
              size="small"
            />
          </Stack>
        </Stack>

        {homeBusy ? (
          <Stack sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notebooksQuery.isLoading ? (
          <Stack sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : notebookItems.length === 0 ? (
          pinnedItems.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: workspaceLayout.panelPaddingY, textAlign: 'center' }}
            >
              {t(scope === 'shared' ? 'empty.shared' : 'empty.owned')}
            </Typography>
          ) : null
        ) : (
          <Box
            aria-busy={notebooksQuery.isFetching}
            sx={{
              ...notebookGridSx,
              opacity: notebooksQuery.isPlaceholderData ? 0.55 : 1,
              pointerEvents: notebooksQuery.isPlaceholderData ? 'none' : undefined,
              transition: workspaceTransitionPresets.opacityOnly,
            }}
          >
            {notebookItems.map((notebook) =>
              renderNotebookCard(notebook, {
                showOwner: scope === 'shared',
                canDelete: scope === 'owned',
                pinned: false,
              }),
            )}
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
      <AddToFavouriteDialog
        open={Boolean(addToFavouriteNotebookId)}
        notebookId={addToFavouriteNotebookId}
        onClose={() => setAddToFavouriteNotebookId(null)}
      />
    </Container>
  )
}
