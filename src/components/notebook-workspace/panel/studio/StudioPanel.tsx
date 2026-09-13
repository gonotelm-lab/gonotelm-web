import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  GenerateSlidesParameters,
  GenerateVideoOverviewParameters,
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
import { SlidesSettingsDialog } from './SlidesSettingsDialog'
import { VideoOverviewSettingsDialog } from './VideoOverviewSettingsDialog'
import { getDefaultStudioOutputLanguage } from '@/i18n/studioOutputLanguage'
import { getDefaultAudioOverviewParameters } from './audioOverviewSettings'
import { defaultDataTableParameters } from './datatableSettings'
import { defaultFlashcardParameters } from './flashcardSettings'
import { getDefaultInfoGraphicParameters } from './infoGraphicSettings'
import { defaultMindmapParameters } from './mindmapSettings'
import { defaultQuizParameters } from './quizSettings'
import { getDefaultReportParameters } from './reportSettings'
import { getDefaultSlidesParameters } from './slidesSettings'
import { getDefaultVideoOverviewParameters } from './videoOverviewSettings'
import { StudioToolCard } from './components/StudioToolCard'
import { useStudioArtifactTasks } from './hooks/useStudioArtifactTasks'
import { useStudioPreviewController } from './preview/useStudioPreviewController'
import { getStudioToolCatalog } from './studioToolCatalog'
import { studioToolGridContainerSx, studioToolGridSx } from './studioToolGridLayout'
import type { SaveMessageAsNoteParams, StudioToolActionId } from './types'
import { workspaceType } from '../../shared/ui/typeTokens'

interface StudioPanelProps {
  notebookId: string
  selectedSourceIds: string[]
  readySourceIds: string[]
  onCollapse: () => void
  onSourceCreated?: () => void
  onRegisterSaveMessageAsNote?: (
    handler: ((params: SaveMessageAsNoteParams) => Promise<void>) | null,
  ) => void
}

const studioListDividerSpacing = {
  mt: workspaceSpace.md,
  mb: workspaceSpace.sm,
}

export const StudioPanel = memo(function StudioPanel({
  notebookId,
  selectedSourceIds,
  readySourceIds,
  onCollapse,
  onSourceCreated,
  onRegisterSaveMessageAsNote,
}: StudioPanelProps) {
  const { t, i18n } = useTranslation(['studio', 'common'])
  const studioToolCatalog = getStudioToolCatalog()
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
    saveMessageAsNote,
    retryArtifact,
    cancelArtifact,
    deleteArtifact,
    convertNoteToSource,
    renameArtifactTitle,
    patchArtifactContentUrl,
    isArtifactActionPending,
  } = useStudioArtifactTasks({ notebookId, onSourceCreated })

  useEffect(() => {
    if (!onRegisterSaveMessageAsNote) {
      return
    }
    onRegisterSaveMessageAsNote(saveMessageAsNote)
    return () => {
      onRegisterSaveMessageAsNote(null)
    }
  }, [onRegisterSaveMessageAsNote, saveMessageAsNote])
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
    updatePreviewContentUrl,
  } = useStudioPreviewController({
    artifactItems,
    onArtifactContentUrlUpdated: patchArtifactContentUrl,
  })

  const [infoGraphicDialogOpen, setInfoGraphicDialogOpen] = useState(false)
  const [infoGraphicDialogKey, setInfoGraphicDialogKey] = useState(0)
  const [infoGraphicParams, setInfoGraphicParams] = useState<GenerateInfoGraphicParameters>(
    getDefaultInfoGraphicParameters,
  )
  const [audioOverviewDialogOpen, setAudioOverviewDialogOpen] = useState(false)
  const [audioOverviewDialogKey, setAudioOverviewDialogKey] = useState(0)
  const [audioOverviewParams, setAudioOverviewParams] = useState<GenerateAudioOverviewParameters>(
    getDefaultAudioOverviewParameters,
  )
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportDialogKey, setReportDialogKey] = useState(0)
  const [reportParams, setReportParams] = useState<GenerateReportParameters>(
    getDefaultReportParameters,
  )
  const [slidesDialogOpen, setSlidesDialogOpen] = useState(false)
  const [slidesDialogKey, setSlidesDialogKey] = useState(0)
  const [slidesParams, setSlidesParams] = useState<GenerateSlidesParameters>(
    getDefaultSlidesParameters,
  )
  const [videoOverviewDialogOpen, setVideoOverviewDialogOpen] = useState(false)
  const [videoOverviewDialogKey, setVideoOverviewDialogKey] = useState(0)
  const [videoOverviewParams, setVideoOverviewParams] = useState<GenerateVideoOverviewParameters>(
    getDefaultVideoOverviewParameters,
  )

  // Keep Studio output-language defaults aligned with UI locale (gonotelm.locale).
  useEffect(() => {
    const outputLanguage = getDefaultStudioOutputLanguage(i18n.language)
    setReportParams((prev) =>
      prev.language === outputLanguage ? prev : { ...prev, language: outputLanguage },
    )
    setAudioOverviewParams((prev) =>
      prev.language === outputLanguage ? prev : { ...prev, language: outputLanguage },
    )
    setInfoGraphicParams((prev) =>
      prev.text_language === outputLanguage
        ? prev
        : { ...prev, text_language: outputLanguage },
    )
    setSlidesParams((prev) =>
      prev.language === outputLanguage ? prev : { ...prev, language: outputLanguage },
    )
    setVideoOverviewParams((prev) =>
      prev.language === outputLanguage ? prev : { ...prev, language: outputLanguage },
    )
  }, [i18n.language])
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
      title: t('studio:kind.mindmap'),
      actionId: 'generate-mindmap',
      mindmap: submitParams,
    })
    setMindmapDialogOpen(false)
  }, [canSubmitArtifactTask, mindmapParams, selectedReadySourceIds, submitArtifactTask, t])

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
      title: t('studio:kind.report'),
      actionId: 'generate-report',
      report: submitParams,
    })
    setReportDialogOpen(false)
  }, [canSubmitArtifactTask, reportParams, selectedReadySourceIds, submitArtifactTask, t])

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
      title: t('studio:kind.audioOverview'),
      actionId: 'generate-audio_overview',
      audioOverview: submitParams,
    })
    setAudioOverviewDialogOpen(false)
  }, [audioOverviewParams, canSubmitArtifactTask, selectedReadySourceIds, submitArtifactTask, t])

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
      title: t('studio:kind.infoGraphic'),
      actionId: 'generate-info_graphic',
      infoGraphic: submitParams,
    })
    setInfoGraphicDialogOpen(false)
  }, [canSubmitArtifactTask, infoGraphicParams, selectedReadySourceIds, submitArtifactTask, t])

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
      title: t('studio:kind.flashcard'),
      actionId: 'generate-flashcard',
      flashcard: submitParams,
    })
    setFlashcardDialogOpen(false)
  }, [canSubmitArtifactTask, flashcardParams, selectedReadySourceIds, submitArtifactTask, t])

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
      title: t('studio:kind.quiz'),
      actionId: 'generate-quiz',
      quiz: submitParams,
    })
    setQuizDialogOpen(false)
  }, [canSubmitArtifactTask, quizParams, selectedReadySourceIds, submitArtifactTask, t])

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
      title: t('studio:kind.dataTable'),
      actionId: 'generate-data_table',
      data_table: submitParams,
    })
    setDataTableDialogOpen(false)
  }, [canSubmitArtifactTask, dataTableParams, selectedReadySourceIds, submitArtifactTask, t])

  const handleCreateSlides = useCallback((params?: GenerateSlidesParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? slidesParams
    if (params) {
      setSlidesParams(params)
    }
    void submitArtifactTask({
      kind: 'slides',
      sourceIds: selectedReadySourceIds,
      title: t('studio:kind.slideDeck'),
      actionId: 'generate-slides',
      slides: submitParams,
    })
    setSlidesDialogOpen(false)
  }, [canSubmitArtifactTask, slidesParams, selectedReadySourceIds, submitArtifactTask, t])

  const handleCreateVideoOverview = useCallback((params?: GenerateVideoOverviewParameters) => {
    if (!canSubmitArtifactTask) {
      return
    }
    const submitParams = params ?? videoOverviewParams
    if (params) {
      setVideoOverviewParams(params)
    }
    void submitArtifactTask({
      kind: 'video_overview',
      sourceIds: selectedReadySourceIds,
      title: t('studio:kind.videoOverview'),
      actionId: 'generate-video_overview',
      videoOverview: submitParams,
    })
    setVideoOverviewDialogOpen(false)
  }, [canSubmitArtifactTask, selectedReadySourceIds, submitArtifactTask, t, videoOverviewParams])

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

  const handleOpenSlidesDialog = useCallback(() => {
    setSlidesDialogKey((prev) => prev + 1)
    setSlidesDialogOpen(true)
  }, [])

  const handleCloseSlidesDialog = useCallback(() => {
    setSlidesDialogOpen(false)
  }, [])

  const handleOpenVideoOverviewDialog = useCallback(() => {
    setVideoOverviewDialogKey((prev) => prev + 1)
    setVideoOverviewDialogOpen(true)
  }, [])

  const handleCloseVideoOverviewDialog = useCallback(() => {
    setVideoOverviewDialogOpen(false)
  }, [])

  const actionHandlers = useMemo<Record<StudioToolActionId, () => void>>(
    () => ({
      'generate-mindmap': () => {
        void handleCreateMindmap()
      },
      'generate-report': () => {
        void handleCreateReport()
      },
      'generate-info_graphic': () => {
        void handleCreateInfoGraphic()
      },
      'generate-audio_overview': () => {
        void handleCreateAudioOverview()
      },
      'generate-video_overview': () => {
        void handleCreateVideoOverview()
      },
      'generate-flashcard': () => {
        void handleCreateFlashcard()
      },
      'generate-quiz': () => {
        void handleCreateQuiz()
      },
      'generate-data_table': () => {
        void handleCreateDataTable()
      },
      'generate-slides': () => {
        void handleCreateSlides()
      },
      // note 从 chat 侧触发，不经 Studio 工具入口
      'save-as-note': () => undefined,
    }),
    [
      handleCreateMindmap,
      handleCreateReport,
      handleCreateInfoGraphic,
      handleCreateAudioOverview,
      handleCreateVideoOverview,
      handleCreateFlashcard,
      handleCreateQuiz,
      handleCreateDataTable,
      handleCreateSlides,
    ],
  )

  const advancedActionHandlers = useMemo<Partial<Record<StudioToolActionId, () => void>>>(
    () => ({
      'generate-mindmap': handleOpenMindmapDialog,
      'generate-report': handleOpenReportDialog,
      'generate-info_graphic': handleOpenInfoGraphicDialog,
      'generate-audio_overview': handleOpenAudioOverviewDialog,
      'generate-video_overview': handleOpenVideoOverviewDialog,
      'generate-flashcard': handleOpenFlashcardDialog,
      'generate-quiz': handleOpenQuizDialog,
      'generate-data_table': handleOpenDataTableDialog,
      'generate-slides': handleOpenSlidesDialog,
    }),
    [
      handleOpenMindmapDialog,
      handleOpenReportDialog,
      handleOpenInfoGraphicDialog,
      handleOpenAudioOverviewDialog,
      handleOpenVideoOverviewDialog,
      handleOpenFlashcardDialog,
      handleOpenQuizDialog,
      handleOpenDataTableDialog,
      handleOpenSlidesDialog,
    ],
  )

  const handleRetryArtifact = useCallback(
    (target: Parameters<typeof retryArtifact>[0]) => {
      void retryArtifact(target)
    },
    [retryArtifact],
  )

  const handleCancelArtifact = useCallback(
    (target: Parameters<typeof cancelArtifact>[0]) => {
      void cancelArtifact(target)
    },
    [cancelArtifact],
  )

  const handleDeleteArtifact = useCallback(
    (target: Parameters<typeof deleteArtifact>[0]) => {
      void deleteArtifact(target)
    },
    [deleteArtifact],
  )

  const handleConvertNoteToSource = useCallback(
    (target: Parameters<typeof convertNoteToSource>[0]) => {
      void convertNoteToSource(target)
    },
    [convertNoteToSource],
  )

  const handleReloadHistoryArtifacts = useCallback(() => {
    void reloadHistoryArtifacts()
  }, [reloadHistoryArtifacts])

  const primaryContent = (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant={panelTitleVariant} sx={panelTitleSx}>
          {t('studio:panel.title')}
        </Typography>
        <IconButton
          size="small"
          color="default"
          aria-label={t('studio:panel.collapseAria')}
          onClick={onCollapse}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
        >
          <KeyboardDoubleArrowRightIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        sx={{
          mt: panelTitleToBodySpacing,
          ...studioToolGridContainerSx,
        }}
      >
        <Box sx={studioToolGridSx}>
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
      </Box>

      <Divider sx={studioListDividerSpacing} />

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('studio:panel.artifactList')}
        </Typography>
        <Tooltip title={historyLoading ? t('studio:panel.refreshing') : t('studio:panel.refresh')}>
          <span>
            <IconButton
              size="small"
              color="default"
              aria-label={t('studio:panel.refreshAria')}
              onClick={handleReloadHistoryArtifacts}
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
              {t('studio:panel.loading')}
            </Typography>
          </Stack>
        ) : artifactItems.length === 0 ? (
          <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('studio:panel.empty')}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={workspaceLayout.listRowGap} sx={{ pr: workspaceSpace.xxs }}>
            {artifactItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '0 72px',
                }}
              >
                <StudioArtifactListItem
                  item={item}
                  previewLoading={previewState.loading && previewState.targetId === item.id}
                  onPreview={openPreviewByItemClick}
                  retryPending={isArtifactActionPending(item.id, 'retry')}
                  cancelPending={isArtifactActionPending(item.id, 'cancel')}
                  deletePending={isArtifactActionPending(item.id, 'delete')}
                  convertPending={isArtifactActionPending(item.id, 'convert')}
                  onRetry={handleRetryArtifact}
                  onCancel={handleCancelArtifact}
                  onDelete={handleDeleteArtifact}
                  onConvertToSource={handleConvertNoteToSource}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )

  const inlineSubpage = previewState.inlineOpen && previewTarget
    ? {
        parentTitle: t('studio:panel.title'),
        title: {
          mindmap: t('studio:kind.mindmap'),
          report: t('studio:kind.report'),
          info_graphic: t('studio:kind.infoGraphic'),
          audio_overview: t('studio:kind.audioOverview'),
          video_overview: t('studio:kind.videoOverview'),
          flashcard: t('studio:kind.flashcard'),
          quiz: t('studio:kind.quiz'),
          data_table: t('studio:kind.dataTable'),
          slides: t('studio:kind.slideDeck'),
          note: t('studio:kind.note'),
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
            onRenameTitle={(title) => renameArtifactTitle(previewTarget.id, title)}
            onContentUrlRefreshed={updatePreviewContentUrl}
          />
        ),
        onClose: closeInlinePreview,
        closeAriaLabel: t('studio:preview.closeInlineAria'),
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
        initialSlideIndex={previewState.overlaySlideIndex}
        onClose={closeOverlayPreview}
        onRetryLoad={retryPreviewLoad}
        onRenameTitle={
          previewTarget
            ? (title) => renameArtifactTitle(previewTarget.id, title)
            : undefined
        }
        onContentUrlRefreshed={updatePreviewContentUrl}
      />

      <InfoGraphicSettingsDialog
        key={`info-graphic-${infoGraphicDialogKey}`}
        open={infoGraphicDialogOpen}
        initialParams={infoGraphicParams}
        onClose={handleCloseInfoGraphicDialog}
        onGenerate={handleCreateInfoGraphic}
      />

      <AudioOverviewSettingsDialog
        key={`audio-overview-${audioOverviewDialogKey}`}
        open={audioOverviewDialogOpen}
        initialParams={audioOverviewParams}
        onClose={handleCloseAudioOverviewDialog}
        onGenerate={handleCreateAudioOverview}
      />

      <MindmapSettingsDialog
        key={`mindmap-${mindmapDialogKey}`}
        open={mindmapDialogOpen}
        initialParams={mindmapParams}
        onClose={handleCloseMindmapDialog}
        onGenerate={handleCreateMindmap}
      />

      <ReportSettingsDialog
        key={`report-${reportDialogKey}`}
        open={reportDialogOpen}
        initialParams={reportParams}
        onClose={handleCloseReportDialog}
        onGenerate={handleCreateReport}
      />

      <FlashcardSettingsDialog
        key={`flashcard-${flashcardDialogKey}`}
        open={flashcardDialogOpen}
        initialParams={flashcardParams}
        onClose={handleCloseFlashcardDialog}
        onGenerate={handleCreateFlashcard}
      />

      <QuizSettingsDialog
        key={`quiz-${quizDialogKey}`}
        open={quizDialogOpen}
        initialParams={quizParams}
        onClose={handleCloseQuizDialog}
        onGenerate={handleCreateQuiz}
      />

      <DataTableSettingsDialog
        key={`data-table-${dataTableDialogKey}`}
        open={dataTableDialogOpen}
        initialParams={dataTableParams}
        onClose={handleCloseDataTableDialog}
        onGenerate={handleCreateDataTable}
      />

      <SlidesSettingsDialog
        key={`slides-${slidesDialogKey}`}
        open={slidesDialogOpen}
        initialParams={slidesParams}
        onClose={handleCloseSlidesDialog}
        onGenerate={handleCreateSlides}
      />

      <VideoOverviewSettingsDialog
        key={`video-overview-${videoOverviewDialogKey}`}
        open={videoOverviewDialogOpen}
        initialParams={videoOverviewParams}
        onClose={handleCloseVideoOverviewDialog}
        onGenerate={handleCreateVideoOverview}
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
})
