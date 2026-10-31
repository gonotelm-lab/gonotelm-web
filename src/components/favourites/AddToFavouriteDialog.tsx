import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  addFavouriteNotebook,
  createFavourite,
  listFavourites,
} from '@/api/favourite'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { showAppToast } from '@/lib/apiErrorToast'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'

interface AddToFavouriteDialogProps {
  open: boolean
  notebookId: string | null
  onClose: () => void
  /** 成功加入后回调（用于刷新 GET notebook 的 favourite 嵌套）。 */
  onAdded?: () => void
}

/**
 * 选择收藏夹并加入笔记本；无夹时引导创建，创建成功后立刻加入。
 */
export function AddToFavouriteDialog({
  open,
  notebookId,
  onClose,
  onAdded,
}: AddToFavouriteDialogProps) {
  const { t } = useTranslation(['favourites', 'common'])
  const queryClient = useQueryClient()
  const [draftName, setDraftName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [addingFavouriteId, setAddingFavouriteId] = useState<string | null>(null)

  const favouritesQuery = useQuery({
    queryKey: ['favourites', 'list'],
    queryFn: () => listFavourites({ limit: 100, offset: 0 }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setDraftName('')
      setErrorMessage(null)
      setAddingFavouriteId(null)
    }
  }, [open])

  const invalidateFavourites = async () => {
    await queryClient.invalidateQueries({ queryKey: ['favourites'] })
  }

  const addMutation = useMutation({
    mutationFn: ({ favouriteId, id }: { favouriteId: string; id: string }) =>
      addFavouriteNotebook(favouriteId, { notebook_id: id }),
  })

  const createMutation = useMutation({
    mutationFn: createFavourite,
  })

  const favourites = favouritesQuery.data?.favourites ?? []
  const busy = addMutation.isPending || createMutation.isPending
  const showCreateGuide = !favouritesQuery.isLoading && favourites.length === 0

  const handleClose = () => {
    if (busy) return
    onClose()
  }

  const handleAddTo = async (favouriteId: string) => {
    if (!notebookId || busy) return
    setErrorMessage(null)
    setAddingFavouriteId(favouriteId)
    try {
      await addMutation.mutateAsync({ favouriteId, id: notebookId })
      await invalidateFavourites()
      onAdded?.()
      showAppToast({ message: t('favourites:add.added'), severity: 'success' })
      onClose()
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'common:error.requestFailed'))
    } finally {
      setAddingFavouriteId(null)
    }
  }

  const handleCreateAndAdd = async () => {
    if (!notebookId || busy) return
    const name = draftName.trim()
    if (!name) {
      setErrorMessage(t('favourites:list.nameRequired'))
      return
    }
    setErrorMessage(null)
    try {
      const created = await createMutation.mutateAsync({ name })
      await addMutation.mutateAsync({ favouriteId: created.id, id: notebookId })
      await invalidateFavourites()
      onAdded?.()
      showAppToast({ message: t('favourites:add.added'), severity: 'success' })
      onClose()
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, 'common:error.requestFailed'))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
    >
      <DialogTitle>{t('favourites:add.title')}</DialogTitle>
      <DialogContent>
        {favouritesQuery.isLoading ? (
          <Stack sx={{ py: workspaceSpace.lg, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : showCreateGuide ? (
          <Stack spacing={workspaceSpace.sm}>
            <Typography variant="body2" color="text.secondary">
              {t('favourites:add.empty')}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              margin="dense"
              label={t('favourites:list.nameLabel')}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              disabled={busy}
            />
          </Stack>
        ) : (
          <Stack spacing={workspaceSpace.sm}>
            <Typography variant="body2" color="text.secondary">
              {t('favourites:add.picking')}
            </Typography>
            <List dense disablePadding>
              {favourites.map((favourite) => (
                <ListItemButton
                  key={favourite.id}
                  disabled={busy}
                  onClick={() => {
                    void handleAddTo(favourite.id)
                  }}
                >
                  <ListItemText
                    primary={favourite.name}
                    secondary={t('favourites:list.notebookCount', {
                      count: favourite.notebook_count,
                    })}
                  />
                  {addingFavouriteId === favourite.id ? (
                    <CircularProgress size={16} />
                  ) : null}
                </ListItemButton>
              ))}
            </List>
            <Box sx={{ pt: workspaceSpace.xs }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('favourites:list.create')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('favourites:list.nameLabel')}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  disabled={busy}
                />
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => {
                    void handleCreateAndAdd()
                  }}
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  {t('favourites:add.createAndAdd')}
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}
        {errorMessage ? (
          <Alert severity="error" sx={{ mt: workspaceSpace.sm }}>
            {errorMessage}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          {t('common:action.cancel')}
        </Button>
        {showCreateGuide ? (
          <Button
            variant="contained"
            onClick={() => {
              void handleCreateAndAdd()
            }}
            disabled={busy}
          >
            {t('favourites:add.createAndAdd')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
