import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined'
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  createFavourite,
  deleteFavourite,
  listFavourites,
  renameFavourite,
} from '@/api/favourite'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { formatNotebookDate } from '@/lib/formatNotebookDate'
import { FavouriteCard } from '@/components/favourites/FavouriteCard'
import { AppShellHeader } from '@/components/shell/AppShellHeader'
import { workspaceDialogLayout } from '@/components/notebook-workspace/shared/ui/dialogLayoutTokens'
import {
  workspaceLayout,
  workspaceSpace,
} from '@/components/notebook-workspace/shared/ui/layoutTokens'

type NameDialogMode = 'create' | 'rename'

const favouriteGridSx = {
  display: 'grid',
  gap: workspaceLayout.listRowGap,
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
} as const

export function FavouritesPage() {
  const { t } = useTranslation(['favourites', 'common'])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deletingFavouriteId, setDeletingFavouriteId] = useState<string | null>(null)
  const [nameDialog, setNameDialog] = useState<{
    mode: NameDialogMode
    favouriteId?: string
    draftName: string
    errorMessage: string | null
  } | null>(null)

  const favouritesQuery = useQuery({
    queryKey: ['favourites', 'list'],
    queryFn: () => listFavourites({ limit: 100, offset: 0 }),
  })

  const createMutation = useMutation({ mutationFn: createFavourite })
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameFavourite(id, { name }),
  })
  const deleteMutation = useMutation({ mutationFn: deleteFavourite })

  const favourites = favouritesQuery.data?.favourites ?? []
  const nameBusy = createMutation.isPending || renameMutation.isPending

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['favourites'] })
  }

  const handleSubmitNameDialog = async () => {
    if (!nameDialog) return
    const name = nameDialog.draftName.trim()
    if (!name) {
      setNameDialog((prev) =>
        prev ? { ...prev, errorMessage: t('favourites:list.nameRequired') } : prev,
      )
      return
    }
    try {
      if (nameDialog.mode === 'create') {
        await createMutation.mutateAsync({ name })
      } else if (nameDialog.favouriteId) {
        await renameMutation.mutateAsync({ id: nameDialog.favouriteId, name })
      }
      await invalidate()
      setNameDialog(null)
    } catch (error) {
      setNameDialog((prev) =>
        prev
          ? {
              ...prev,
              errorMessage: apiErrorMessage(error, 'common:error.requestFailed'),
            }
          : prev,
      )
    }
  }

  const handleDeleteFavourite = async (favouriteId: string) => {
    setDeletingFavouriteId(favouriteId)
    try {
      await deleteMutation.mutateAsync(favouriteId)
      await invalidate()
    } finally {
      setDeletingFavouriteId(null)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: workspaceSpace.xl }}>
      <Stack spacing={workspaceLayout.panelPaddingY}>
        <AppShellHeader />
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />

        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: workspaceLayout.listInlineGap,
          }}
        >
          <Typography variant="h6">{t('favourites:list.title')}</Typography>
          <Button
            size="small"
            startIcon={<CreateNewFolderOutlinedIcon />}
            onClick={() =>
              setNameDialog({
                mode: 'create',
                draftName: '',
                errorMessage: null,
              })
            }
          >
            {t('favourites:list.create')}
          </Button>
        </Stack>

        {favouritesQuery.isLoading ? (
          <Stack sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : favourites.length === 0 ? (
          <Stack spacing={1} sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('favourites:list.empty')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('favourites:list.emptyHint')}
            </Typography>
          </Stack>
        ) : (
          <Box sx={favouriteGridSx}>
            {favourites.map((favourite) => (
              <FavouriteCard
                key={favourite.id}
                id={favourite.id}
                title={favourite.name}
                dateLabel={formatNotebookDate(favourite.created_at)}
                notebookCount={favourite.notebook_count}
                onOpen={() => navigate(`/favourites/${favourite.id}`)}
                onRename={() =>
                  setNameDialog({
                    mode: 'rename',
                    favouriteId: favourite.id,
                    draftName: favourite.name,
                    errorMessage: null,
                  })
                }
                onDelete={() => handleDeleteFavourite(favourite.id)}
                deleting={
                  deleteMutation.isPending && deletingFavouriteId === favourite.id
                }
              />
            ))}
          </Box>
        )}
      </Stack>

      <Dialog
        open={Boolean(nameDialog)}
        onClose={nameBusy ? undefined : () => setNameDialog(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
      >
        <DialogTitle>
          {nameDialog?.mode === 'rename'
            ? t('favourites:list.renameTitle')
            : t('favourites:list.createTitle')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label={t('favourites:list.nameLabel')}
            value={nameDialog?.draftName ?? ''}
            onChange={(event) =>
              setNameDialog((prev) =>
                prev
                  ? { ...prev, draftName: event.target.value, errorMessage: null }
                  : prev,
              )
            }
            disabled={nameBusy}
            error={Boolean(nameDialog?.errorMessage)}
            helperText={nameDialog?.errorMessage ?? undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDialog(null)} disabled={nameBusy}>
            {t('common:action.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={nameBusy}
            onClick={() => {
              void handleSubmitNameDialog()
            }}
          >
            {t('common:action.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
