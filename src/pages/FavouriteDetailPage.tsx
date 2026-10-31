import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import {
  listFavouriteNotebooks,
  listFavourites,
  removeFavouriteNotebooks,
} from '@/api/favourite'
import { showAppToast } from '@/lib/apiErrorToast'
import { getNotebookEmoji } from '@/lib/notebookEmoji'
import { useMeQuery } from '@/components/auth/useMeQuery'
import { InvalidFavouriteNotebookCard } from '@/components/favourites/InvalidFavouriteNotebookCard'
import { NotebookCard } from '@/components/home/NotebookCard'
import { AppShellHeader } from '@/components/shell/AppShellHeader'
import {
  workspaceLayout,
  workspaceRadius,
  workspaceSpace,
} from '@/components/notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '@/components/notebook-workspace/shared/ui/typeTokens'
import { toNotebookCardViewModel } from './home/notebookCardViewModel'
import type { FavouriteNotebookItem, NotebookSummary } from '@/types/api'

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

const batchRemoveChunkSize = 100

export function FavouriteDetailPage() {
  const { favouriteId = '' } = useParams<{ favouriteId: string }>()
  const { t } = useTranslation(['favourites', 'common', 'home'])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const meQuery = useMeQuery()
  const meUserId = meQuery.data?.user_id
  const [removingNotebookId, setRemovingNotebookId] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([])

  const favouritesQuery = useQuery({
    queryKey: ['favourites', 'list'],
    queryFn: () => listFavourites({ limit: 100, offset: 0 }),
  })

  const notebooksQuery = useQuery({
    queryKey: ['favourites', favouriteId, 'notebooks'],
    queryFn: () =>
      listFavouriteNotebooks({ favouriteId, limit: 100, offset: 0 }),
    enabled: Boolean(favouriteId),
  })

  const favouriteName = useMemo(() => {
    const match = favouritesQuery.data?.favourites.find(
      (item) => item.id === favouriteId,
    )
    return match?.name
  }, [favouriteId, favouritesQuery.data?.favourites])

  const removeMutation = useMutation({
    mutationFn: (notebookIds: string[]) =>
      removeFavouriteNotebooks(favouriteId, { notebook_ids: notebookIds }),
  })

  const items = notebooksQuery.data?.items ?? []
  const selectedIdSet = useMemo(
    () => new Set(selectedNotebookIds),
    [selectedNotebookIds],
  )

  useEffect(() => {
    setBatchMode(false)
    setSelectedNotebookIds([])
  }, [favouriteId])

  useEffect(() => {
    if (!batchMode) return
    const aliveIds = new Set(items.map((item) => item.notebook_id))
    setSelectedNotebookIds((prev) => prev.filter((id) => aliveIds.has(id)))
  }, [batchMode, items])

  const invalidateDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['favourites', favouriteId, 'notebooks'],
    })
    await queryClient.invalidateQueries({ queryKey: ['favourites', 'list'] })
  }

  const exitBatchMode = () => {
    setBatchMode(false)
    setSelectedNotebookIds([])
  }

  const toggleSelected = (notebookId: string) => {
    setSelectedNotebookIds((prev) =>
      prev.includes(notebookId)
        ? prev.filter((id) => id !== notebookId)
        : [...prev, notebookId],
    )
  }

  const handleRemove = async (notebookId: string) => {
    if (removeMutation.isPending) return
    setRemovingNotebookId(notebookId)
    try {
      await removeMutation.mutateAsync([notebookId])
      await invalidateDetail()
      showAppToast({ message: t('favourites:detail.removed'), severity: 'success' })
    } finally {
      setRemovingNotebookId(null)
    }
  }

  const handleBatchRemove = async () => {
    if (removeMutation.isPending || selectedNotebookIds.length === 0) return
    const ids = [...selectedNotebookIds]
    try {
      for (let offset = 0; offset < ids.length; offset += batchRemoveChunkSize) {
        const chunk = ids.slice(offset, offset + batchRemoveChunkSize)
        await removeMutation.mutateAsync(chunk)
      }
      await invalidateDetail()
      showAppToast({
        message: t('favourites:detail.batchRemoved', { count: ids.length }),
        severity: 'success',
      })
      exitBatchMode()
    } catch {
      // 错误 toast 由 request 层处理；保留批量模式方便重试。
    }
  }

  const renderSelectionChrome = (notebookId: string) => {
    if (!batchMode) return null
    const selected = selectedIdSet.has(notebookId)
    return (
      <Checkbox
        size="small"
        checked={selected}
        disableRipple
        inputProps={{ 'aria-label': t('favourites:detail.selectedCount', { count: 1 }) }}
        onClick={(event) => {
          // 勾选层盖在 CardActionArea 之上，阻断冒泡避免点卡片逻辑干扰。
          event.stopPropagation()
        }}
        onChange={() => {
          toggleSelected(notebookId)
        }}
        sx={{
          position: 'absolute',
          // 与 NotebookCard 右上角菜单按钮同锚点，避免批量模式视觉跳动。
          top: 8,
          right: 4,
          zIndex: 3,
          p: 0.5,
          color: 'text.secondary',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
          borderRadius: 1,
          '& .MuiSvgIcon-root': {
            fontSize: workspaceIconSize.md,
          },
        }}
      />
    )
  }

  const renderValidCard = (item: FavouriteNotebookItem, notebook: NotebookSummary) => {
    const viewModel = toNotebookCardViewModel(notebook)
    const isOwned = Boolean(meUserId) && notebook.owner?.user_id === meUserId
    const selected = selectedIdSet.has(item.notebook_id)
    return (
      <Box
        key={item.notebook_id}
        sx={{
          position: 'relative',
          borderRadius: workspaceRadius.lg,
          outline: selected ? '2px solid' : 'none',
          outlineColor: 'primary.main',
          outlineOffset: 1,
        }}
      >
        {renderSelectionChrome(item.notebook_id)}
        <NotebookCard
          title={viewModel.title}
          sourceCount={viewModel.sourceCount}
          dateLabel={viewModel.dateLabel}
          isPublic={viewModel.isPublic}
          coverUrl={viewModel.coverUrl}
          emoji={getNotebookEmoji(viewModel.id)}
          owner={!isOwned ? viewModel.owner : undefined}
          onOpen={() => {
            if (batchMode) {
              toggleSelected(item.notebook_id)
              return
            }
            navigate(`/notebook/${viewModel.id}`)
          }}
          onDelete={
            batchMode ? undefined : () => handleRemove(item.notebook_id)
          }
          deleteActionLabel={t('favourites:detail.removeFromFavourite')}
          deleteDialogTitle={t('favourites:detail.deleteTitle')}
          deleteDialogBody={t('favourites:detail.deleteBody')}
          deleting={
            removeMutation.isPending && removingNotebookId === item.notebook_id
          }
        />
      </Box>
    )
  }

  const renderInvalidCard = (item: FavouriteNotebookItem) => {
    const selected = selectedIdSet.has(item.notebook_id)
    return (
      <Box
        key={item.notebook_id}
        sx={{
          position: 'relative',
          borderRadius: workspaceRadius.lg,
          outline: selected ? '2px solid' : 'none',
          outlineColor: 'primary.main',
          outlineOffset: 1,
        }}
      >
        {renderSelectionChrome(item.notebook_id)}
        <InvalidFavouriteNotebookCard
          batchMode={batchMode}
          onBatchToggle={() => toggleSelected(item.notebook_id)}
          onDelete={() => handleRemove(item.notebook_id)}
          deleting={
            removeMutation.isPending && removingNotebookId === item.notebook_id
          }
          deleteActionLabel={t('favourites:detail.removeFromFavourite')}
          deleteDialogTitle={t('favourites:detail.deleteTitle')}
          deleteDialogBody={t('favourites:detail.deleteBody')}
        />
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: workspaceSpace.xl }}>
      <Stack spacing={workspaceLayout.panelPaddingY}>
        <AppShellHeader />
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: workspaceLayout.listInlineGap,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <IconButton
              component={RouterLink}
              to="/favourites"
              aria-label={t('favourites:detail.back')}
              size="small"
            >
              <ArrowBackOutlinedIcon fontSize="small" />
            </IconButton>
            <Typography variant="h6" noWrap>
              {favouriteName ?? t('favourites:list.title')}
            </Typography>
          </Stack>

          {items.length > 0 ? (
            batchMode ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t('favourites:detail.selectedCount', {
                    count: selectedNotebookIds.length,
                  })}
                </Typography>
                <Button size="small" onClick={exitBatchMode} disabled={removeMutation.isPending}>
                  {t('favourites:detail.batchCancel')}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  disabled={
                    selectedNotebookIds.length === 0 || removeMutation.isPending
                  }
                  onClick={() => {
                    void handleBatchRemove()
                  }}
                >
                  {removeMutation.isPending
                    ? t('common:action.deleting')
                    : t('favourites:detail.batchRemove')}
                </Button>
              </Stack>
            ) : (
              <Button
                size="small"
                startIcon={<ChecklistOutlinedIcon />}
                onClick={() => setBatchMode(true)}
              >
                {t('favourites:detail.batchEdit')}
              </Button>
            )
          ) : null}
        </Stack>

        {notebooksQuery.isLoading ? (
          <Stack sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Stack>
        ) : items.length === 0 ? (
          <Stack spacing={1} sx={{ py: workspaceLayout.panelPaddingY, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('favourites:detail.empty')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('favourites:detail.emptyHint')}
            </Typography>
            <Button component={RouterLink} to="/" size="small">
              {t('favourites:nav.home')}
            </Button>
          </Stack>
        ) : (
          <Box sx={notebookGridSx}>
            {items.map((item) =>
              item.invalid || !item.notebook
                ? renderInvalidCard(item)
                : renderValidCard(item, item.notebook),
            )}
          </Box>
        )}
      </Stack>
    </Container>
  )
}
