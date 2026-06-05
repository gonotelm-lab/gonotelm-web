import { useMemo } from 'react'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Alert,
  Box,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { panelTitleSx, panelTitleToBodySpacing, panelTitleVariant } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { StudioArtifactListItem } from './components/StudioArtifactListItem'
import { StudioArtifactPreviewOverlay } from './components/StudioArtifactPreviewOverlay'
import { StudioToolCard } from './components/StudioToolCard'
import { useStudioArtifactTasks } from './hooks/useStudioArtifactTasks'
import { studioToolCatalog } from './studioToolCatalog'
import type { StudioToolActionId } from './types'

interface StudioPanelProps {
  notebookId: string
  selectedSourceIds: string[]
  readySourceIds: string[]
  onCollapse: () => void
}

const studioPanelTitle = '工作区'
const studioListDividerSpacing = {
  mt: 1.2,
  mb: 0.8,
}

export function StudioPanel({
  notebookId,
  selectedSourceIds,
  readySourceIds,
  onCollapse,
}: StudioPanelProps) {
  const readySourceIdSet = useMemo(() => new Set(readySourceIds), [readySourceIds])
  const selectedReadySourceIds = useMemo(
    () => selectedSourceIds.filter((sourceId) => readySourceIdSet.has(sourceId)),
    [readySourceIdSet, selectedSourceIds],
  )
  const canCreateMindmap =
    Boolean(notebookId) && selectedReadySourceIds.length > 0

  const {
    artifactItems,
    historyLoading,
    historyError,
    pendingActions,
    previewState,
    previewTarget,
    reloadHistoryArtifacts,
    submitArtifactTask,
    retryArtifact,
    cancelArtifact,
    deleteArtifact,
    isArtifactActionPending,
    openArtifactPreview,
    retryPreviewLoad,
    closePreviewOverlay,
  } = useStudioArtifactTasks({ notebookId })

  const handleCreateMindmap = () => {
    if (!canCreateMindmap) {
      return
    }
    void submitArtifactTask({
      kind: 'mindmap',
      sourceIds: selectedReadySourceIds,
      title: 'Mind Map',
      actionId: 'generate-mindmap',
    })
  }

  const actionHandlers: Record<StudioToolActionId, () => void> = {
    'generate-mindmap': handleCreateMindmap,
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Stack sx={{ height: '100%', minHeight: 0 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant={panelTitleVariant} sx={panelTitleSx}>
            {studioPanelTitle}
          </Typography>
          <IconButton
            size="small"
            color="default"
            aria-label="收起右侧面板"
            onClick={onCollapse}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            <KeyboardDoubleArrowRightIcon fontSize="small" />
          </IconButton>
        </Stack>

        {!canCreateMindmap ? (
          <Alert severity="info" sx={{ mt: 0.6, mb: 0.9, py: 0.25 }}>
            请先在左侧来源面板勾选至少一个已就绪来源。
          </Alert>
        ) : null}

        <Box
          sx={{
            mt: panelTitleToBodySpacing,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1,
          }}
        >
          {studioToolCatalog.map((tool) => {
            const actionId = tool.actionId
            const disabled = tool.availability !== 'available' || (tool.artifactKind === 'mindmap' && !canCreateMindmap)
            const pending = Boolean(actionId && pendingActions[actionId])
            return (
              <StudioToolCard
                key={tool.id}
                tool={tool}
                selected={Boolean(previewTarget && tool.artifactKind === previewTarget.kind)}
                disabled={disabled}
                pending={pending}
                onClick={actionId ? actionHandlers[actionId] : undefined}
              />
            )
          })}
        </Box>

        <Divider sx={studioListDividerSpacing} />

        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            产物列表
          </Typography>
          <Tooltip title={historyLoading ? '刷新中' : '刷新列表'}>
            <span>
              <IconButton
                size="small"
                color="default"
                aria-label="刷新产物列表"
                onClick={() => {
                  void reloadHistoryArtifacts()
                }}
                disabled={historyLoading}
              >
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {historyError ? (
          <Alert severity="error" sx={{ mt: 0.9, py: 0.25 }}>
            {historyError}
          </Alert>
        ) : null}

        <Box sx={{ mt: 1, flex: 1, minHeight: 0, overflowY: 'auto', ...subtleScrollbarSx }}>
          {historyLoading && artifactItems.length === 0 ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                正在加载产物列表...
              </Typography>
            </Stack>
          ) : artifactItems.length === 0 ? (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                暂无产物，点击上方按钮开始生成。
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={0.8} sx={{ pr: 0.3 }}>
              {artifactItems.map((item) => (
                <StudioArtifactListItem
                  key={item.id}
                  item={item}
                  previewLoading={previewState.loading && previewState.targetId === item.id}
                  onPreview={openArtifactPreview}
                  retryPending={isArtifactActionPending(item.id, 'retry')}
                  cancelPending={isArtifactActionPending(item.id, 'cancel')}
                  deletePending={isArtifactActionPending(item.id, 'delete')}
                  onRetry={(target) => {
                    void retryArtifact(target)
                  }}
                  onCancel={(target) => {
                    void cancelArtifact(target)
                  }}
                  onDelete={(target) => {
                    void deleteArtifact(target)
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>

      <StudioArtifactPreviewOverlay
        open={previewState.open}
        artifact={previewTarget}
        loading={previewState.loading}
        error={previewState.error}
        content={previewState.content}
        onClose={closePreviewOverlay}
        onRetryLoad={retryPreviewLoad}
      />
    </Paper>
  )
}
