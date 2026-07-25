import { useCallback, useMemo, useState } from 'react'
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
import type { GenerateAudioOverviewParameters, GenerateInfoGraphicParameters } from '@/types/api'
import { PanelSubpageLayout } from '../../shared/ui/PanelSubpageLayout'
import { panelTitleSx, panelTitleToBodySpacing, panelTitleVariant } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { StudioArtifactInlinePreview } from './components/StudioArtifactInlinePreview'
import { StudioArtifactListItem } from './components/StudioArtifactListItem'
import { StudioArtifactPreviewOverlay } from './components/StudioArtifactPreviewOverlay'
import { AudioOverviewSettingsDialog } from './AudioOverviewSettingsDialog'
import { InfoGraphicSettingsDialog } from './InfoGraphicSettingsDialog'
import { defaultAudioOverviewParameters } from './audioOverviewSettings'
import { defaultInfoGraphicParameters } from './infoGraphicSettings'
import { StudioToolCard } from './components/StudioToolCard'
import { useStudioArtifactTasks } from './hooks/useStudioArtifactTasks'
import { useStudioPreviewController } from './preview/useStudioPreviewController'
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
  const canSubmitArtifactTask =
    Boolean(notebookId) && selectedReadySourceIds.length > 0

  const {
    artifactItems,
    historyLoading,
    historyError,
    pendingActions,
    reloadHistoryArtifacts,
    submitArtifactTask,
    retryArtifact,
    cancelArtifact,
    deleteArtifact,
    isArtifactActionPending,
  } = useStudioArtifactTasks({ notebookId })
  const {
    previewState,
    previewTarget,
    previewCapability,
    openPreviewByItemClick,
    openOverlayFromInline,
    closeInlinePreview,
    closeOverlayPreview,
    retryPreviewLoad,
    downloadPreviewContent,
  } = useStudioPreviewController({ artifactItems })

  const [infoGraphicDialogOpen, setInfoGraphicDialogOpen] = useState(false)
  const [infoGraphicDialogKey, setInfoGraphicDialogKey] = useState(0)
  const [infoGraphicParams, setInfoGraphicParams] = useState<GenerateInfoGraphicParameters>(
    defaultInfoGraphicParameters,
  )
  const [audioOverviewDialogOpen, setAudioOverviewDialogOpen] = useState(false)
  const [audioOverviewDialogKey, setAudioOverviewDialogKey] = useState(0)
  const [audioOverviewParams, setAudioOverviewParams] = useState<GenerateAudioOverviewParameters>(
    defaultAudioOverviewParameters,
  )

  const handleCreateMindmap = () => {
    if (!canSubmitArtifactTask) {
      return
    }
    void submitArtifactTask({
      kind: 'mindmap',
      sourceIds: selectedReadySourceIds,
      title: '思维导图',
      actionId: 'generate-mindmap',
    })
  }

  const handleCreateReport = () => {
    if (!canSubmitArtifactTask) {
      return
    }
    void submitArtifactTask({
      kind: 'report',
      sourceIds: selectedReadySourceIds,
      title: '报告',
      actionId: 'generate-report',
    })
  }

  const handleCreateAudioOverview = useCallback((params?: GenerateAudioOverviewParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? audioOverviewParams
    if (params) {
      setAudioOverviewParams(params)
    }
    void submitArtifactTask({
      kind: 'audio_overview',
      sourceIds: selectedReadySourceIds,
      title: '音频概览',
      actionId: 'generate-audio_overview',
      audioOverview: submitParams,
    })
    setAudioOverviewDialogOpen(false)
  }, [audioOverviewParams, canSubmitArtifactTask, selectedReadySourceIds, submitArtifactTask])

  const handleCreateInfoGraphic = useCallback((params?: GenerateInfoGraphicParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? infoGraphicParams
    if (params) {
      setInfoGraphicParams(params)
    }
    void submitArtifactTask({
      kind: 'info_graphic',
      sourceIds: selectedReadySourceIds,
      title: '信息图',
      actionId: 'generate-info_graphic',
      infoGraphic: submitParams,
    })
    setInfoGraphicDialogOpen(false)
  }, [canSubmitArtifactTask, infoGraphicParams, selectedReadySourceIds, submitArtifactTask])

  const handleCloseInfoGraphicDialog = useCallback(() => {
    setInfoGraphicDialogOpen(false)
  }, [])

  const handleOpenInfoGraphicDialog = useCallback(() => {
    setInfoGraphicDialogKey((prev) => prev + 1)
    setInfoGraphicDialogOpen(true)
  }, [])

  const handleCloseAudioOverviewDialog = useCallback(() => {
    setAudioOverviewDialogOpen(false)
  }, [])

  const handleOpenAudioOverviewDialog = useCallback(() => {
    setAudioOverviewDialogKey((prev) => prev + 1)
    setAudioOverviewDialogOpen(true)
  }, [])

  const actionHandlers: Record<StudioToolActionId, () => void> = {
    'generate-mindmap': handleCreateMindmap,
    'generate-report': handleCreateReport,
    'generate-info_graphic': () => handleCreateInfoGraphic(),
    'generate-audio_overview': () => handleCreateAudioOverview(),
  }

  const advancedActionHandlers: Partial<Record<StudioToolActionId, () => void>> = {
    'generate-info_graphic': handleOpenInfoGraphicDialog,
    'generate-audio_overview': handleOpenAudioOverviewDialog,
  }

  const primaryContent = (
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
          const disabled =
            tool.availability !== 'available'
            || (Boolean(tool.artifactKind) && !canSubmitArtifactTask)
          const pending = Boolean(actionId && pendingActions[actionId])
          return (
            <StudioToolCard
              key={tool.id}
              tool={tool}
              selected={Boolean(previewTarget && tool.artifactKind === previewTarget.kind)}
              disabled={disabled}
              pending={pending}
              onClick={actionId ? actionHandlers[actionId] : undefined}
              onAdvancedClick={actionId ? advancedActionHandlers[actionId] : undefined}
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

      <Box
        sx={(theme) => ({
          mt: 1,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          ...subtleScrollbarSx(theme),
        })}
      >
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
                onPreview={openPreviewByItemClick}
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
  )

  const inlineSubpage = previewState.inlineOpen && previewTarget
    ? {
        parentTitle: 'Studio',
        title: previewTarget.title,
        content: (
          <StudioArtifactInlinePreview
            artifact={previewTarget}
            loading={previewState.loading}
            error={previewState.error}
            content={previewState.content}
            canOpenOverlay={Boolean(previewCapability?.overlay)}
            onOpenOverlay={openOverlayFromInline}
            onDownload={downloadPreviewContent}
            onRetryLoad={retryPreviewLoad}
          />
        ),
        onClose: closeInlinePreview,
        closeAriaLabel: '关闭内联预览',
      }
    : null

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <PanelSubpageLayout
        primaryContent={primaryContent}
        subpage={inlineSubpage}
        subpageBodySx={{ overflow: 'hidden' }}
      />

      <StudioArtifactPreviewOverlay
        open={previewState.overlayOpen}
        artifact={previewTarget}
        loading={previewState.loading}
        error={previewState.error}
        content={previewState.content}
        onClose={closeOverlayPreview}
        onRetryLoad={retryPreviewLoad}
      />

      <InfoGraphicSettingsDialog
        key={infoGraphicDialogKey}
        open={infoGraphicDialogOpen}
        initialParams={infoGraphicParams}
        onClose={handleCloseInfoGraphicDialog}
        onGenerate={handleCreateInfoGraphic}
      />

      <AudioOverviewSettingsDialog
        key={audioOverviewDialogKey}
        open={audioOverviewDialogOpen}
        initialParams={audioOverviewParams}
        onClose={handleCloseAudioOverviewDialog}
        onGenerate={handleCreateAudioOverview}
      />
    </Paper>
  )
}
