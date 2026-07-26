import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Alert,
  Box,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type {
  GenerateAudioOverviewParameters,
  GenerateDataTableParameters,
  GenerateFlashcardParameters,
  GenerateInfoGraphicParameters,
  GenerateMindmapParameters,
  GenerateQuizParameters,
  GenerateReportParameters,
} from '@/types/api'
import { PanelSubpageLayout } from '../../shared/ui/PanelSubpageLayout'
import { workspaceLayout, workspaceRadius, workspaceSpace } from '../../shared/ui/layoutTokens'
import { panelTitleSx, panelTitleToBodySpacing, panelTitleVariant } from '../../shared/ui/panelStyles'
import { subtleScrollbarSx } from '../../shared/ui/scrollbar'
import { StudioArtifactInlinePreview } from './components/StudioArtifactInlinePreview'
import { StudioArtifactListItem } from './components/StudioArtifactListItem'
import { StudioArtifactPreviewOverlay } from './components/StudioArtifactPreviewOverlay'
import { AudioOverviewSettingsDialog } from './AudioOverviewSettingsDialog'
import { InfoGraphicSettingsDialog } from './InfoGraphicSettingsDialog'
import { DataTableSettingsDialog } from './DataTableSettingsDialog'
import { FlashcardSettingsDialog } from './FlashcardSettingsDialog'
import { MindmapSettingsDialog } from './MindmapSettingsDialog'
import { QuizSettingsDialog } from './QuizSettingsDialog'
import { ReportSettingsDialog } from './ReportSettingsDialog'
import { defaultAudioOverviewParameters } from './audioOverviewSettings'
import { defaultDataTableParameters } from './datatableSettings'
import { defaultFlashcardParameters } from './flashcardSettings'
import { defaultInfoGraphicParameters } from './infoGraphicSettings'
import { defaultMindmapParameters } from './mindmapSettings'
import { defaultQuizParameters } from './quizSettings'
import { defaultReportParameters } from './reportSettings'
import { StudioToolCard } from './components/StudioToolCard'
import { useStudioArtifactTasks } from './hooks/useStudioArtifactTasks'
import { useStudioPreviewController } from './preview/useStudioPreviewController'
import { studioToolCatalog } from './studioToolCatalog'
import type { StudioToolActionId } from './types'
import { workspaceType } from '../../shared/ui/typeTokens'

interface StudioPanelProps {
  notebookId: string
  selectedSourceIds: string[]
  readySourceIds: string[]
  onCollapse: () => void
}

const studioPanelTitle = '工作区'
const studioListDividerSpacing = {
  mt: workspaceSpace.md,
  mb: workspaceSpace.sm,
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
    actionErrorToast,
    clearActionErrorToast,
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
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportDialogKey, setReportDialogKey] = useState(0)
  const [reportParams, setReportParams] = useState<GenerateReportParameters>(
    defaultReportParameters,
  )
  const [mindmapDialogOpen, setMindmapDialogOpen] = useState(false)
  const [mindmapDialogKey, setMindmapDialogKey] = useState(0)
  const [mindmapParams, setMindmapParams] = useState<GenerateMindmapParameters>(
    defaultMindmapParameters,
  )
  const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false)
  const [flashcardDialogKey, setFlashcardDialogKey] = useState(0)
  const [flashcardParams, setFlashcardParams] = useState<GenerateFlashcardParameters>(
    defaultFlashcardParameters,
  )
  const [quizDialogOpen, setQuizDialogOpen] = useState(false)
  const [quizDialogKey, setQuizDialogKey] = useState(0)
  const [quizParams, setQuizParams] = useState<GenerateQuizParameters>(
    defaultQuizParameters,
  )
  const [dataTableDialogOpen, setDataTableDialogOpen] = useState(false)
  const [dataTableDialogKey, setDataTableDialogKey] = useState(0)
  const [dataTableParams, setDataTableParams] = useState<GenerateDataTableParameters>(
    defaultDataTableParameters,
  )

  const handleCreateMindmap = useCallback((params?: GenerateMindmapParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? mindmapParams
    if (params) {
      setMindmapParams(params)
    }
    void submitArtifactTask({
      kind: 'mindmap',
      sourceIds: selectedReadySourceIds,
      title: '思维导图',
      actionId: 'generate-mindmap',
      mindmap: submitParams,
    })
    setMindmapDialogOpen(false)
  }, [canSubmitArtifactTask, mindmapParams, selectedReadySourceIds, submitArtifactTask])

  const handleCreateReport = useCallback((params?: GenerateReportParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? reportParams
    if (params) {
      setReportParams(params)
    }
    void submitArtifactTask({
      kind: 'report',
      sourceIds: selectedReadySourceIds,
      title: '报告',
      actionId: 'generate-report',
      report: submitParams,
    })
    setReportDialogOpen(false)
  }, [canSubmitArtifactTask, reportParams, selectedReadySourceIds, submitArtifactTask])

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

  const handleCreateFlashcard = useCallback((params?: GenerateFlashcardParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? flashcardParams
    if (params) {
      setFlashcardParams(params)
    }
    void submitArtifactTask({
      kind: 'flashcard',
      sourceIds: selectedReadySourceIds,
      title: '闪卡',
      actionId: 'generate-flashcard',
      flashcard: submitParams,
    })
    setFlashcardDialogOpen(false)
  }, [canSubmitArtifactTask, flashcardParams, selectedReadySourceIds, submitArtifactTask])

  const handleCreateQuiz = useCallback((params?: GenerateQuizParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? quizParams
    if (params) {
      setQuizParams(params)
    }
    void submitArtifactTask({
      kind: 'quiz',
      sourceIds: selectedReadySourceIds,
      title: '测验',
      actionId: 'generate-quiz',
      quiz: submitParams,
    })
    setQuizDialogOpen(false)
  }, [canSubmitArtifactTask, quizParams, selectedReadySourceIds, submitArtifactTask])

  const handleCreateDataTable = useCallback((params?: GenerateDataTableParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? dataTableParams
    if (params) {
      setDataTableParams(params)
    }
    void submitArtifactTask({
      kind: 'data_table',
      sourceIds: selectedReadySourceIds,
      title: '数据表',
      actionId: 'generate-data_table',
      data_table: submitParams,
    })
    setDataTableDialogOpen(false)
  }, [canSubmitArtifactTask, dataTableParams, selectedReadySourceIds, submitArtifactTask])

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

  const handleCloseReportDialog = useCallback(() => {
    setReportDialogOpen(false)
  }, [])

  const handleOpenMindmapDialog = useCallback(() => {
    setMindmapDialogKey((prev) => prev + 1)
    setMindmapDialogOpen(true)
  }, [])

  const handleCloseMindmapDialog = useCallback(() => {
    setMindmapDialogOpen(false)
  }, [])

  const handleOpenReportDialog = useCallback(() => {
    setReportDialogKey((prev) => prev + 1)
    setReportDialogOpen(true)
  }, [])

  const handleOpenFlashcardDialog = useCallback(() => {
    setFlashcardDialogKey((prev) => prev + 1)
    setFlashcardDialogOpen(true)
  }, [])

  const handleCloseFlashcardDialog = useCallback(() => {
    setFlashcardDialogOpen(false)
  }, [])

  const handleOpenQuizDialog = useCallback(() => {
    setQuizDialogKey((prev) => prev + 1)
    setQuizDialogOpen(true)
  }, [])

  const handleCloseQuizDialog = useCallback(() => {
    setQuizDialogOpen(false)
  }, [])

  const handleOpenDataTableDialog = useCallback(() => {
    setDataTableDialogKey((prev) => prev + 1)
    setDataTableDialogOpen(true)
  }, [])

  const handleCloseDataTableDialog = useCallback(() => {
    setDataTableDialogOpen(false)
  }, [])

  const actionHandlers: Record<StudioToolActionId, () => void> = {
    'generate-mindmap': () => handleCreateMindmap(),
    'generate-report': () => handleCreateReport(),
    'generate-info_graphic': () => handleCreateInfoGraphic(),
    'generate-audio_overview': () => handleCreateAudioOverview(),
    'generate-flashcard': () => handleCreateFlashcard(),
    'generate-quiz': () => handleCreateQuiz(),
    'generate-data_table': () => handleCreateDataTable(),
  }

  const advancedActionHandlers: Partial<Record<StudioToolActionId, () => void>> = {
    'generate-mindmap': handleOpenMindmapDialog,
    'generate-report': handleOpenReportDialog,
    'generate-info_graphic': handleOpenInfoGraphicDialog,
    'generate-audio_overview': handleOpenAudioOverviewDialog,
    'generate-flashcard': handleOpenFlashcardDialog,
    'generate-quiz': handleOpenQuizDialog,
    'generate-data_table': handleOpenDataTableDialog,
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
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: workspaceLayout.listRowGap,
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
        <Alert severity="error" sx={{ mt: workspaceSpace.sm, py: workspaceSpace.xxs }}>
          {historyError}
        </Alert>
      ) : null}

      <Box
        sx={(theme) => ({
          mt: workspaceSpace.sm,
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
          <Stack spacing={workspaceLayout.listRowGap} sx={{ pr: workspaceSpace.xxs }}>
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
        parentTitle: '工作区',
        title: {
          mindmap: '思维导图',
          report: '报告',
          info_graphic: '信息图',
          audio_overview: '音频概览',
          flashcard: '闪卡',
          quiz: '测验',
          data_table: '数据表',
        }[previewTarget.kind] || previewTarget.kind,
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
        px: { xs: workspaceSpace.lg, md: workspaceLayout.panelPaddingX },
        py: workspaceLayout.panelPaddingY,
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

      <MindmapSettingsDialog
        key={mindmapDialogKey}
        open={mindmapDialogOpen}
        initialParams={mindmapParams}
        onClose={handleCloseMindmapDialog}
        onGenerate={handleCreateMindmap}
      />

      <ReportSettingsDialog
        key={reportDialogKey}
        open={reportDialogOpen}
        initialParams={reportParams}
        onClose={handleCloseReportDialog}
        onGenerate={handleCreateReport}
      />

      <FlashcardSettingsDialog
        key={flashcardDialogKey}
        open={flashcardDialogOpen}
        initialParams={flashcardParams}
        onClose={handleCloseFlashcardDialog}
        onGenerate={handleCreateFlashcard}
      />

      <QuizSettingsDialog
        key={quizDialogKey}
        open={quizDialogOpen}
        initialParams={quizParams}
        onClose={handleCloseQuizDialog}
        onGenerate={handleCreateQuiz}
      />

      <DataTableSettingsDialog
        key={dataTableDialogKey}
        open={dataTableDialogOpen}
        initialParams={dataTableParams}
        onClose={handleCloseDataTableDialog}
        onGenerate={handleCreateDataTable}
      />

      {typeof document !== 'undefined'
        ? createPortal(
            <Snackbar
              key={actionErrorToast?.key}
              open={Boolean(actionErrorToast)}
              autoHideDuration={2400}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              // PanelSubpageLayout 有 transform，fixed 会相对右侧面板；挂到 body 才是视口正中
              sx={{
                top: '50%',
                left: '50%',
                right: 'auto',
                bottom: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
              onClose={(_, reason) => {
                if (reason === 'clickaway') {
                  return
                }
                clearActionErrorToast()
              }}
            >
              <Paper
                elevation={2}
                sx={{
                  px: workspaceSpace.md,
                  py: workspaceSpace.xxs,
                  borderRadius: workspaceRadius.md,
                  border: '1px solid',
                  borderColor: 'primary.main',
                  bgcolor: 'primary.dark',
                  maxWidth: 420,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontSize: workspaceType.xs,
                    lineHeight: 1.35,
                    color: 'background.default',
                  }}
                >
                  {actionErrorToast?.message ?? ''}
                </Typography>
              </Paper>
            </Snackbar>,
            document.body,
          )
        : null}
    </Paper>
  )
}
