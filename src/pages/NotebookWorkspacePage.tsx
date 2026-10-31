import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  createSource,
  deleteSource,
  retrySourcePreparation,
  updateSourceTitle,
  uploadFileSource,
  uploadToObjectStorage,
} from '../api/source'
import { removeFavouriteNotebooks } from '../api/favourite'
import {
  generateNotebookDescription,
  getNotebook,
  getOrCreateNotebookChat,
  listNotebookSources,
  updateNotebook,
} from '../api/notebook'
import { hashFile } from '../lib/md5'
import { apiErrorMessage } from '../lib/apiErrorMessage'
import { isNotebookNotFoundError } from '../lib/apiErrorPresentation'
import { showAppToast } from '../lib/apiErrorToast'
import { resolveUploadMimeType } from '../lib/sourceMime'
import {
  isNotebookOwner as resolveIsNotebookOwner,
  useNotebookAccessQuery,
} from '../components/notebook-workspace/hooks/useNotebookAccessQuery'
import { useSourcePolling } from '../components/notebook-workspace/hooks/useSourcePolling'
import { type SourceCard, useWorkspaceStore } from '../store/workspace'
import type { Notebook, SourceKind, SourceStatus } from '../types/api'
import {
  ChatPanel,
  CustomizeNotebookDialog,
  NotebookSharingDialog,
  SourceSelectionController,
  SourcesPanel,
  StudioPanel,
  WorkspaceHeader,
  type ChatPanelActionState,
  type ChatPanelActions,
  type SourceListItem,
  type WorkspaceHeaderChatMenu,
} from '../components/notebook-workspace'
import { WorkspaceMobileTabBar } from '../components/notebook-workspace/layout/WorkspaceMobileTabBar'
import {
  workspaceMobilePanelDefault,
  type WorkspaceMobilePanel,
} from '../components/notebook-workspace/layout/workspaceMobilePanel'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'
import {
  workspaceMotion,
  workspaceTransitionPresets,
} from '../components/notebook-workspace/shared/ui/motionTokens'
import type { ChatCitationJumpRequest } from '../components/notebook-workspace/panel/chat/types'
import { collapsedPanelRailWidthPx } from '../components/notebook-workspace/shared/ui/collapsedPanelRailLayout'
import type { SaveMessageAsNoteParams } from '../components/notebook-workspace/panel/studio/types'
import { AddToFavouriteDialog } from '../components/favourites/AddToFavouriteDialog'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { NotebookNotFoundPage } from './NotebookNotFoundPage'
import { resolveNotebookWorkspaceTitle } from './notebook-workspace/resolveNotebookWorkspaceTitle'

const processingStatusSet = new Set<SourceStatus>(['uploading', 'preparing'])
const notebookSourcesPageLimit = 50
const sourceRemoveAnimationMs = 300
const textSourceTitleMaxChars = 20
const workspaceSourcesPanelDefaultWidthPx = 280
const workspaceInsightsPanelDefaultWidthPx = 460
const workspacePanelMinWidthPx = 220
const workspacePanelAutoCollapseWidthPx = 170
const workspacePanelMaxWidthRatio = 0.5
/** 面板宽度自适应缩放的设计基准宽度（默认 280/460 按此宽度设计）。 */
const workspacePanelWidthScaleBasePx = 1440
const workspaceCenterMinWidthPx = 420
const workspaceResizeHandleWidthPx = 10

/**
 * 首帧面板宽度：按视口宽度和设计基准同步换算好，
 * 避免挂载后从默认 280/460 过渡到目标宽度（看起来像“展开动画”）。
 */
const resolveInitialPanelWidths = (): { sources: number; insights: number } => {
  const fallback = {
    sources: workspaceSourcesPanelDefaultWidthPx,
    insights: workspaceInsightsPanelDefaultWidthPx,
  }
  if (typeof window === 'undefined' || window.innerWidth <= 0) {
    return fallback
  }

  // 面板容器在 md+ 有 workspaceSpace.sm（8px）的左右留白。
  const containerWidth = Math.max(0, window.innerWidth - 16)
  if (containerWidth <= 0) {
    return fallback
  }

  const ratio = containerWidth / workspacePanelWidthScaleBasePx
  const clampPanelWidth = (width: number, otherWidth: number) => {
    const maxByRatio = Math.floor(containerWidth * workspacePanelMaxWidthRatio)
    const maxByCenter =
      containerWidth -
      workspaceCenterMinWidthPx -
      otherWidth -
      workspaceResizeHandleWidthPx * 2
    const maxWidth = Math.max(0, Math.min(maxByRatio, maxByCenter))
    const minWidth = Math.min(workspacePanelMinWidthPx, maxWidth)
    return Math.max(minWidth, Math.min(maxWidth, Math.round(width)))
  }

  const initialSources = Math.round(workspaceSourcesPanelDefaultWidthPx * ratio)
  const initialInsights = Math.round(workspaceInsightsPanelDefaultWidthPx * ratio)
  return {
    sources: clampPanelWidth(initialSources, initialInsights),
    insights: clampPanelWidth(initialInsights, clampPanelWidth(initialSources, initialInsights)),
  }
}
const workspacePanelGridTransition = workspaceTransitionPresets.panelGridColumns
const workspaceSourcesColumnVar = '--workspace-sources-column'
const workspaceInsightsColumnVar = '--workspace-insights-column'
const workspaceLeftHandleColumnVar = '--workspace-left-handle-column'
const workspaceRightHandleColumnVar = '--workspace-right-handle-column'
/** 序列化 id 列表用的分隔符，避免轮询产生的等价数组触发下游重渲染。 */
const sourceIdListSeparator = '\u0000'

const isProcessingStatus = (status?: SourceStatus) =>
  !!status && processingStatusSet.has(status)

const detectSourceIconType = (
  kind: SourceKind,
  fileFormat?: string,
) => {
  if (kind === 'text') return 'text'
  if (kind === 'url') return 'url'

  const normalizedFormat = fileFormat?.trim().toLowerCase() ?? ''
  if (normalizedFormat === 'application/pdf') return 'pdf'
  if (normalizedFormat === 'application/epub+zip') return 'epub'
  if (
    normalizedFormat ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'xlsx'
  }
  if (
    normalizedFormat ===
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx'
  }
  if (normalizedFormat.startsWith('text/plain')) return 'txt'
  if (normalizedFormat.startsWith('text/markdown')) return 'markdown'
  if (normalizedFormat.startsWith('text/csv')) return 'csv'
  if (normalizedFormat.startsWith('image/')) return 'image'
  return 'docx'
}

const truncateUTF8 = (text: string, maxChars: number) => {
  const chars = Array.from(text)
  if (chars.length <= maxChars) {
    return text
  }
  return chars.slice(0, maxChars).join('')
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const applyWorkspacePanelGridColumns = (
  container: HTMLDivElement,
  {
    sourcesCollapsed,
    insightsCollapsed,
    sourcesWidth,
    insightsWidth,
  }: {
    sourcesCollapsed: boolean
    insightsCollapsed: boolean
    sourcesWidth: number
    insightsWidth: number
  },
) => {
  container.style.setProperty(
    workspaceSourcesColumnVar,
    sourcesCollapsed
      ? `${collapsedPanelRailWidthPx}px`
      : `${sourcesWidth}px`,
  )
  container.style.setProperty(
    workspaceInsightsColumnVar,
    insightsCollapsed
      ? `${collapsedPanelRailWidthPx}px`
      : `${insightsWidth}px`,
  )
  container.style.setProperty(
    workspaceLeftHandleColumnVar,
    sourcesCollapsed ? '0px' : `${workspaceResizeHandleWidthPx}px`,
  )
  container.style.setProperty(
    workspaceRightHandleColumnVar,
    insightsCollapsed ? '0px' : `${workspaceResizeHandleWidthPx}px`,
  )
}

export function NotebookWorkspacePage() {
  const { t } = useTranslation('workspace')
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isMobileWorkspace = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileActivePanel, setMobileActivePanel] = useState<WorkspaceMobilePanel>(
    workspaceMobilePanelDefault,
  )
  const [isSourcesPanelCollapsed, setIsSourcesPanelCollapsed] = useState(false)
  const [isInsightsPanelCollapsed, setIsInsightsPanelCollapsed] = useState(false)
  const [sourcesPanelWidthPx, setSourcesPanelWidthPx] = useState(
    () => resolveInitialPanelWidths().sources,
  )
  const [insightsPanelWidthPx, setInsightsPanelWidthPx] = useState(
    () => resolveInitialPanelWidths().insights,
  )
  const [workspaceContainerWidthPx, setWorkspaceContainerWidthPx] = useState(0)
  const [isPanelLayoutAnimating, setIsPanelLayoutAnimating] = useState(false)
  const [selectedSourceIds, setSelectedSourceIds] = useState<Record<string, boolean>>({})
  const [removingSourceIds, setRemovingSourceIds] = useState<Record<string, boolean>>({})
  const [isHydratingSources, setIsHydratingSources] = useState(false)
  const [citationPreviewRequest, setCitationPreviewRequest] = useState<
    (ChatCitationJumpRequest & { requestId: number }) | null
  >(null)
  const [isSharingDialogOpen, setIsSharingDialogOpen] = useState(false)
  const [isAddToFavouriteDialogOpen, setIsAddToFavouriteDialogOpen] = useState(false)
  const [isFavouriteToggling, setIsFavouriteToggling] = useState(false)
  const [isCustomizeNotebookDialogOpen, setIsCustomizeNotebookDialogOpen] = useState(false)
  const [aiNotebookDescription, setAiNotebookDescription] = useState('')
  const [isGeneratingNotebookDescription, setIsGeneratingNotebookDescription] = useState(false)
  /** 本次进入 notebook 是否已尝试过自动 AI 摘要（成功/失败/无可生成都算），防来源后续变更重触。 */
  const autoDescAttemptedForVisitRef = useRef(false)
  const notebookDescGenerationInFlightRef = useRef(false)
  // 递增以作废在途 generation 结果；关/开自定义或换 notebook 时 resetWorkspaceUiState / onSaved 均会 bump。
  const notebookDescGenEpochRef = useRef(0)
  /** 在途请求被作废后需要再跑一轮时，靠 nudge 触发 effect。 */
  const [notebookDescGenNudge, setNotebookDescGenNudge] = useState(0)
  // 顶栏“更多选项”菜单是对话面板的 remote：actionsRef 持有面板动作，
  // actionState 由面板回报，用来禁用“刷新对话”并驱动 header spinner。
  const chatPanelActionsRef = useRef<ChatPanelActions | null>(null)
  const [chatPanelActionState, setChatPanelActionState] = useState<ChatPanelActionState>({
    hasChatId: false,
    isClearingContext: false,
    isStreaming: false,
  })

  const sources = useWorkspaceStore((s) => s.sources)
  const addSource = useWorkspaceStore((s) => s.addSource)
  const patchSource = useWorkspaceStore((s) => s.patchSource)
  const removeSource = useWorkspaceStore((s) => s.removeSource)
  const setSources = useWorkspaceStore((s) => s.setSources)
  const setSourceStatus = useWorkspaceStore((s) => s.setSourceStatus)
  const notebookMeta = useWorkspaceStore((s) => s.notebookMeta)
  const patchNotebookMeta = useWorkspaceStore((s) => s.patchNotebookMeta)
  const resetWorkspace = useWorkspaceStore((s) => s.reset)
  const removeSourceTimersRef = useRef<number[]>([])
  const workspacePanelsRef = useRef<HTMLDivElement | null>(null)
  const leftResizeHandleRef = useRef<HTMLDivElement | null>(null)
  const rightResizeHandleRef = useRef<HTMLDivElement | null>(null)
  const sourcesPanelWidthRef = useRef(sourcesPanelWidthPx)
  const insightsPanelWidthRef = useRef(insightsPanelWidthPx)
  const sourcesPanelCollapsedRef = useRef(isSourcesPanelCollapsed)
  const insightsPanelCollapsedRef = useRef(isInsightsPanelCollapsed)
  const stopPanelResizeRef = useRef<(() => void) | null>(null)
  const citationPreviewRequestSeqRef = useRef(0)
  const saveMessageAsNoteRef = useRef<
    ((params: SaveMessageAsNoteParams) => Promise<void>) | null
  >(null)
  const panelLayoutAnimTimerRef = useRef<number | null>(null)
  const panelLayoutCommitTimerRef = useRef<number | null>(null)
  const panelLayoutCommitPendingRef = useRef(false)

  const syncWorkspacePanelGridFromRefs = useCallback(
    (overrides?: {
      sourcesCollapsed?: boolean
      insightsCollapsed?: boolean
      sourcesWidth?: number
      insightsWidth?: number
    }) => {
      const container = workspacePanelsRef.current
      if (!container) return
      applyWorkspacePanelGridColumns(container, {
        sourcesCollapsed: overrides?.sourcesCollapsed ?? sourcesPanelCollapsedRef.current,
        insightsCollapsed: overrides?.insightsCollapsed ?? insightsPanelCollapsedRef.current,
        sourcesWidth: Math.round(overrides?.sourcesWidth ?? sourcesPanelWidthRef.current),
        insightsWidth: Math.round(overrides?.insightsWidth ?? insightsPanelWidthRef.current),
      })
    },
    [],
  )

  const schedulePanelLayoutReactCommit = useCallback(() => {
    // 列宽已在点击时同步改掉；React 提交必须延后，否则整页重渲染会堵住首帧，看起来像空等 1s
    // 从 ref 对齐全部 panel 状态，避免连点收展时只提交最后一次回调而丢状态
    panelLayoutCommitPendingRef.current = true
    if (panelLayoutCommitTimerRef.current !== null) {
      window.clearTimeout(panelLayoutCommitTimerRef.current)
    }
    panelLayoutCommitTimerRef.current = window.setTimeout(() => {
      panelLayoutCommitTimerRef.current = null
      const nextSourcesCollapsed = sourcesPanelCollapsedRef.current
      const nextInsightsCollapsed = insightsPanelCollapsedRef.current
      const nextSourcesWidth = Math.round(sourcesPanelWidthRef.current)
      const nextInsightsWidth = Math.round(insightsPanelWidthRef.current)
      startTransition(() => {
        setIsSourcesPanelCollapsed(nextSourcesCollapsed)
        setIsInsightsPanelCollapsed(nextInsightsCollapsed)
        // 收起时也保留宽度，展开才能还原手动调整后的尺寸
        setSourcesPanelWidthPx(nextSourcesWidth)
        setInsightsPanelWidthPx(nextInsightsWidth)
        setIsPanelLayoutAnimating(true)
      })
      if (panelLayoutAnimTimerRef.current !== null) {
        window.clearTimeout(panelLayoutAnimTimerRef.current)
      }
      panelLayoutAnimTimerRef.current = window.setTimeout(() => {
        setIsPanelLayoutAnimating(false)
        panelLayoutAnimTimerRef.current = null
      }, workspaceMotion.durationPanelGridMs)
    }, 0)
  }, [])

  const resetWorkspaceUiState = useCallback(() => {
    setRemovingSourceIds({})
    setIsHydratingSources(true)
    autoDescAttemptedForVisitRef.current = false
    notebookDescGenerationInFlightRef.current = false
    notebookDescGenEpochRef.current += 1
    setIsGeneratingNotebookDescription(false)
    setAiNotebookDescription('')
  }, [])

  const beginHydratingSources = useCallback(() => {
    setIsHydratingSources(true)
  }, [])

  const applyPanelSizingState = useCallback(
    ({
      nextSourcesCollapsed,
      nextInsightsCollapsed,
      nextSourcesWidth,
      nextInsightsWidth,
    }: {
      nextSourcesCollapsed: boolean
      nextInsightsCollapsed: boolean
      nextSourcesWidth: number
      nextInsightsWidth: number
    }) => {
      if (nextSourcesCollapsed !== isSourcesPanelCollapsed) {
        setIsSourcesPanelCollapsed(nextSourcesCollapsed)
      }
      if (nextInsightsCollapsed !== isInsightsPanelCollapsed) {
        setIsInsightsPanelCollapsed(nextInsightsCollapsed)
      }
      if (nextSourcesWidth !== sourcesPanelWidthPx) {
        setSourcesPanelWidthPx(nextSourcesWidth)
      }
      if (nextInsightsWidth !== insightsPanelWidthPx) {
        setInsightsPanelWidthPx(nextInsightsWidth)
      }
    },
    [
      insightsPanelWidthPx,
      isInsightsPanelCollapsed,
      isSourcesPanelCollapsed,
      sourcesPanelWidthPx,
    ],
  )

  useEffect(() => {
    resetWorkspace()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetWorkspaceUiState()
    // HMR/remount 会清空 Zustand；若 React Query 缓存还在，立刻回填，避免标题闪成 Untitled
    if (!id) return
    const cached = queryClient.getQueryData<Notebook>(['notebook', id])
    if (!cached) return
    patchNotebookMeta({
      id: cached.id,
      name: cached.name ?? '',
      // desc 只跟自定义摘要；脏 desc（flag=false 仍带 desc）不进 store。
      desc: cached.flags?.customize_description === true ? (cached.desc ?? '') : '',
      customizeDescription: cached.flags?.customize_description ?? false,
      sourceCount: cached.source_count,
      coverUrl: cached.cover_url || undefined,
    })
  }, [id, patchNotebookMeta, queryClient, resetWorkspace, resetWorkspaceUiState])

  useEffect(() => {
    return () => {
      removeSourceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      removeSourceTimersRef.current = []
      stopPanelResizeRef.current?.()
      stopPanelResizeRef.current = null
      if (panelLayoutCommitTimerRef.current !== null) {
        window.clearTimeout(panelLayoutCommitTimerRef.current)
        panelLayoutCommitTimerRef.current = null
      }
      if (panelLayoutAnimTimerRef.current !== null) {
        window.clearTimeout(panelLayoutAnimTimerRef.current)
        panelLayoutAnimTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    sourcesPanelWidthRef.current = sourcesPanelWidthPx
  }, [sourcesPanelWidthPx])

  useEffect(() => {
    insightsPanelWidthRef.current = insightsPanelWidthPx
  }, [insightsPanelWidthPx])

  useEffect(() => {
    sourcesPanelCollapsedRef.current = isSourcesPanelCollapsed
  }, [isSourcesPanelCollapsed])

  useEffect(() => {
    insightsPanelCollapsedRef.current = isInsightsPanelCollapsed
  }, [isInsightsPanelCollapsed])

  useEffect(() => {
    if (
      isSourcesPanelCollapsed === sourcesPanelCollapsedRef.current &&
      isInsightsPanelCollapsed === insightsPanelCollapsedRef.current
    ) {
      panelLayoutCommitPendingRef.current = false
    }
    // 点击收展已先改 DOM；pending 期间勿用旧 React state 把列宽打回去
    if (panelLayoutCommitPendingRef.current) return
    syncWorkspacePanelGridFromRefs({
      sourcesCollapsed: isSourcesPanelCollapsed,
      insightsCollapsed: isInsightsPanelCollapsed,
      sourcesWidth: sourcesPanelWidthPx,
      insightsWidth: insightsPanelWidthPx,
    })
  }, [
    insightsPanelWidthPx,
    isInsightsPanelCollapsed,
    isSourcesPanelCollapsed,
    sourcesPanelWidthPx,
    syncWorkspacePanelGridFromRefs,
  ])

  const handleSourceReady = useCallback(() => {
    if (!id) return
    // source 进入 ready 后，notebook 可能自动更新（如 source_count/描述），这里主动刷新一次。
    void queryClient.invalidateQueries({
      queryKey: ['notebook', id],
      exact: true,
    })
  }, [id, queryClient])

  const handleSourceCreated = useCallback(() => {
    if (!id) return
    // note 转 source 后重新拉取 sources 列表
    void queryClient.invalidateQueries({
      queryKey: ['notebook', id],
      exact: true,
    })
  }, [id, queryClient])

  useEffect(() => {
    const container = workspacePanelsRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0)
      setWorkspaceContainerWidthPx((prev) => (prev === nextWidth ? prev : nextWidth))
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useSourcePolling({
    notebookId: id,
    sources,
    removingSourceIds,
    setSourceStatus,
    onSourceReady: handleSourceReady,
  })

  // （原 render 期同步镜像 customize_description 到 ref 已移除：直读 store getState，
  //  避免违反 react-hooks/refs；epoch 机制已覆盖自定义开关与换页两项作废。）

  // 自动 AI 摘要：仅在「进入本 notebook 后第一次」满足条件时触发。
  // - 进入时已有来源，等全部终态后生成一次；或
  // - 进入时无来源，之后从无到有并全部终态后生成一次；
  // 无来源时不打 generation，本地空摘要即可。
  // 来源后续增删/变更不再重触。自定义文案走「自定义笔记本」对话框（PATCH），不经本 effect。
  useEffect(() => {
    if (!id || isHydratingSources) return
    if (notebookDescGenerationInFlightRef.current) return
    if (autoDescAttemptedForVisitRef.current) return

    // 进入笔记本的首个 commit 里，reset effect 虽已同步清空 store，但本轮 effect 闭包里的
    // sources/meta 仍是上一个笔记本的渲染快照；StrictMode 又会把 effect 跑两遍并复位守卫，
    // 于是会拿残留 sources 连发两次 generation。这里一律以 live store 为准，并要求 store
    // 已切到当前 notebook（reset + query 回填之后）再继续。
    const liveState = useWorkspaceStore.getState()
    if (liveState.notebookMeta.id !== id) return
    if (liveState.notebookMeta.customizeDescription) {
      autoDescAttemptedForVisitRef.current = true
      return
    }

    const activeSources = liveState.sources.filter(
      (source) => !removingSourceIds[source.id],
    )
    // 无 sources：不触发 generation；本 visit 仍可等「从无到有」后再试。
    if (activeSources.length === 0) {
      // 来源被删空时同步清掉过气的 AI 草稿与生成态，是跨外部数据源的刻意复位。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiNotebookDescription('')
      setIsGeneratingNotebookDescription(false)
      return
    }

    const hasNonTerminal = activeSources.some(
      (source) => source.status !== 'ready' && source.status !== 'failed',
    )
    if (hasNonTerminal) return

    // 已有来源且全部终态：无论能否生成，都视为本 visit 已尝试，避免后续 source 变更重入。
    autoDescAttemptedForVisitRef.current = true

    const hasReady = activeSources.some((source) => source.status === 'ready')
    if (!hasReady) {
      // 全部来源失败：清掉展示位并停掉 loading，同样是刻意复位。
      setAiNotebookDescription('')
      setIsGeneratingNotebookDescription(false)
      return
    }

    const epoch = notebookDescGenEpochRef.current
    notebookDescGenerationInFlightRef.current = true
    setIsGeneratingNotebookDescription(true)
    void (async () => {
      try {
        const result = await generateNotebookDescription(id)
        // 在途期间若已开/关自定义或换 notebook，丢弃结果。
        if (epoch !== notebookDescGenEpochRef.current) return
        // 响应落地前若已开出自定义（epoch 已 bump 走不到这里），直读 store 兜底避免覆盖。
        if (useWorkspaceStore.getState().notebookMeta.customizeDescription) return
        // AI 摘要不落库；只放本地展示，不写 notebook.desc / query.desc。
        setAiNotebookDescription(result.desc ?? '')
      } catch (error) {
        if (epoch === notebookDescGenEpochRef.current) {
          console.warn('generate notebook description failed', error)
        }
      } finally {
        const epochChanged = epoch !== notebookDescGenEpochRef.current
        notebookDescGenerationInFlightRef.current = false
        if (epochChanged && !autoDescAttemptedForVisitRef.current) {
          // 关自定义时可能撞上 in-flight 提前 return；请求结束后再 nudge 一轮。
          setNotebookDescGenNudge((n) => n + 1)
        } else {
          // 当前 epoch 正常收尾；或 epoch 已变但本 visit 已尝试过，停掉 loading 即可。
          setIsGeneratingNotebookDescription(false)
        }
      }
    })()
  }, [
    id,
    isHydratingSources,
    notebookDescGenNudge,
    notebookMeta.customizeDescription,
    notebookMeta.id,
    removingSourceIds,
    sources,
  ])

  const notebookQuery = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id),
    enabled: !!id,
    // 404 不重试：尽快进入专用页面；其他错误保留一次重试。
    retry: (failureCount, error) =>
      !isNotebookNotFoundError(error) && failureCount < 1,
  })
  const notebookChatQuery = useQuery({
    queryKey: ['notebook-chat', id],
    queryFn: () => getOrCreateNotebookChat(id),
    // 笔记本还没确认可访问时不要额外创建/拉取对话，否则会重复触发 100001。
    enabled: Boolean(id) && notebookQuery.isSuccess,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const notebookNotFound = isNotebookNotFoundError(notebookQuery.error)

  // 笔记本可访问后再取权限：不存在/无权限时不额外制造 100001 请求。
  // 顶栏的分享入口只属于 owner，分享对话框复用同一份 access 缓存。
  const notebookAccessQuery = useNotebookAccessQuery(
    id,
    Boolean(id) && notebookQuery.isSuccess,
  )
  const isNotebookOwner = resolveIsNotebookOwner(notebookAccessQuery.data)
  // 聊天开场标题区只在「共享给当前用户」时展示 owner；自己拥有时不展示。
  const notebookOwnerForHeader = useMemo(() => {
    if (isNotebookOwner) {
      return undefined
    }
    const owner = notebookQuery.data?.owner
    if (!owner) {
      return undefined
    }
    return { nickname: owner.nickname, avatarUrl: owner.avatar_url }
  }, [isNotebookOwner, notebookQuery.data?.owner])
  // 无编辑权限时整个工作区进入只读：隐藏/禁用所有会写内容的入口。
  const canManageContent =
    notebookAccessQuery.data?.can_manage_content ?? false
  const canManageNotebook =
    notebookAccessQuery.data?.can_manage_notebook ?? false

  const notebookIdFromQuery = notebookQuery.data?.id
  const notebookNameFromQuery = notebookQuery.data?.name ?? ''
  const notebookDescFromQuery = notebookQuery.data?.desc ?? ''
  const notebookCustomizeDescriptionFromQuery =
    notebookQuery.data?.flags?.customize_description ?? false
  const notebookSourceCountFromQuery = notebookQuery.data?.source_count
  const notebookCoverUrlFromQuery = notebookQuery.data?.cover_url

  useEffect(() => {
    if (!notebookIdFromQuery || notebookSourceCountFromQuery === undefined) {
      return
    }

    patchNotebookMeta({
      id: notebookIdFromQuery,
      sourceCount: notebookSourceCountFromQuery,
      name: notebookNameFromQuery,
      // desc 只跟自定义摘要；AI 草稿在 aiNotebookDescription，互不覆盖。
      // 脏 desc（flag=false 仍带 desc）不进 store，避免 Dialog 开关预填过期摘要。
      desc: notebookCustomizeDescriptionFromQuery
        ? notebookDescFromQuery
        : '',
      customizeDescription: notebookCustomizeDescriptionFromQuery,
      coverUrl: notebookCoverUrlFromQuery || undefined,
    })
  }, [
    notebookCustomizeDescriptionFromQuery,
    notebookDescFromQuery,
    notebookIdFromQuery,
    notebookNameFromQuery,
    notebookSourceCountFromQuery,
    notebookCoverUrlFromQuery,
    patchNotebookMeta,
  ])

  // Hydrate on notebook id / source_count only — rename/refetch of same count must not
  // wipe & re-download the entire sources list.
  useEffect(() => {
    if (!id || notebookSourceCountFromQuery === undefined) {
      return
    }

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    beginHydratingSources()
    const hydrateNotebookSources = async () => {
      if (notebookSourceCountFromQuery <= 0) {
        setSources([])
        return
      }

      let merged: SourceCard[] = []
      let offset = 0
      while (offset < notebookSourceCountFromQuery) {
        const page = await listNotebookSources(id, {
          limit: notebookSourcesPageLimit,
          offset,
        })
        if (cancelled) return
        if (page.sources.length === 0) break

        merged = [
          ...merged,
          ...page.sources.map((source) => ({
            id: source.id,
            kind: source.kind,
            status: source.status,
            title: source.title,
            textContent: source.text?.text,
            urlContent: source.url?.url,
            fileFormat: source.file?.format,
            fileUrl: source.file?.url,
            parsedContentUrl: source.parsed_content?.url,
          })),
        ]
        offset = merged.length
        if (!page.has_more) break
      }

      if (!cancelled) {
        setSources(merged)
      }
    }

    void hydrateNotebookSources().catch((error) => {
      console.warn('hydrate notebook sources failed', error)
    }).finally(() => {
      if (!cancelled) {
        setIsHydratingSources(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [beginHydratingSources, id, notebookSourceCountFromQuery, setSources])

  const createSourceMutation = useMutation({
    mutationFn: ({
      notebookId,
      payload,
    }: {
      notebookId: string
      payload: Parameters<typeof createSource>[1]
    }) => createSource(notebookId, payload),
  })
  const uploadSourceMutation = useMutation({
    mutationFn: ({ sourceId, payload }: { sourceId: string; payload: Parameters<typeof uploadFileSource>[1] }) =>
      uploadFileSource(sourceId, payload),
  })
  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),
  })
  const retrySourceMutation = useMutation({
    mutationFn: (sourceId: string) => retrySourcePreparation(sourceId),
  })
  const updateSourceTitleMutation = useMutation({
    mutationFn: ({ sourceId, title }: { sourceId: string; title: string }) =>
      updateSourceTitle(sourceId, { title }),
  })
  const updateNotebookNameMutation = useMutation({
    mutationFn: ({ notebookId, name }: { notebookId: string; name: string }) =>
      updateNotebook(notebookId, { name }),
  })

  const isBusy = useMemo(
    () =>
      createSourceMutation.isPending ||
      uploadSourceMutation.isPending ||
      deleteSourceMutation.isPending ||
      retrySourceMutation.isPending,
    [
      createSourceMutation.isPending,
      uploadSourceMutation.isPending,
      deleteSourceMutation.isPending,
      retrySourceMutation.isPending,
    ],
  )

  // 引用相等由 store 保证：setSources 在内容等价时复用旧卡片对象，[sources] 不变这里就不重算；
  // 单个来源变化时新对象只影响对应行，由 SourceListRow 的 memo 比较器兜住。
  const sourceListItems = useMemo<SourceListItem[]>(
    () =>
      sources.map((source) => ({
        id: source.id,
        kind: source.kind,
        title: source.title ?? '',
        name: source.title?.trim() ? source.title : source.id,
        iconType: detectSourceIconType(source.kind, source.fileFormat),
        status: source.status,
        textContent: source.textContent,
        urlContent: source.urlContent,
        fileFormat: source.fileFormat,
        fileUrl: source.fileUrl,
        parsedContentUrl: source.parsedContentUrl,
      })),
    [sources],
  )

  const selectableSourceItems = useMemo(
    () =>
      sourceListItems.filter((item) => !isProcessingStatus(item.status)),
    [sourceListItems],
  )

  const allSourcesChecked =
    selectableSourceItems.length > 0 &&
    selectableSourceItems.every((item) => Boolean(selectedSourceIds[item.id]))

  const someSourcesChecked =
    !allSourcesChecked &&
    selectableSourceItems.some((item) => Boolean(selectedSourceIds[item.id]))

  const selectedSourceIdListRaw = useMemo(
    () =>
      Object.keys(selectedSourceIds).filter((sourceId) => Boolean(selectedSourceIds[sourceId])),
    [selectedSourceIds],
  )
  const readySourceIdListRaw = useMemo(
    () =>
      sourceListItems
        .filter((item) => item.status === 'ready')
        .map((item) => item.id),
    [sourceListItems],
  )
  // 轮询 / 重复勾选会让 state 换新对象但 id 集合不变：序列化成 key 再 memo，
  // 保持数组引用相等（原先用 render 期读写 ref 守卫，现在不需要了）。
  const selectedSourceIdListKey = useMemo(
    () => selectedSourceIdListRaw.join(sourceIdListSeparator),
    [selectedSourceIdListRaw],
  )
  const selectedSourceIdList = useMemo(
    () => (selectedSourceIdListKey ? selectedSourceIdListKey.split(sourceIdListSeparator) : []),
    [selectedSourceIdListKey],
  )

  const readySourceIdListKey = useMemo(
    () => readySourceIdListRaw.join(sourceIdListSeparator),
    [readySourceIdListRaw],
  )
  const readySourceIdList = useMemo(
    () => (readySourceIdListKey ? readySourceIdListKey.split(sourceIdListSeparator) : []),
    [readySourceIdListKey],
  )
  // Chat/Studio only need selection for submit/generate — defer so Sources checkbox stays snappy.
  const deferredSelectedSourceIdList = useDeferredValue(selectedSourceIdList)

  const toggleAllSourceChecked = useCallback((checked: boolean) => {
    const next: Record<string, boolean> = {}
    selectableSourceItems.forEach((item) => {
      next[item.id] = checked
    })
    // Sources panel mirrors this locally for checkbox sync; Chat/Studio read deferredSelectedSourceIdList.
    setSelectedSourceIds(next)
  }, [selectableSourceItems])

  const toggleSourceItemChecked = useCallback((id: string, checked: boolean) => {
    setSelectedSourceIds((prev) => ({
      ...prev,
      [id]: checked,
    }))
  }, [])

  const handleCreateSimpleSource = useCallback(async (
    kind: Extract<SourceKind, 'text' | 'url'>,
    content: string,
  ) => {
    if (!id) return
    const normalized = content.trim()
    if (!normalized) return

    try {
      const created = await createSourceMutation.mutateAsync({
        notebookId: id,
        payload: {
          kind,
          text: kind === 'text' ? normalized : undefined,
          url: kind === 'url' ? normalized : undefined,
        },
      })
      addSource({
        id: created.id,
        kind,
        status: 'preparing',
        title: kind === 'text' ? truncateUTF8(normalized, textSourceTitleMaxChars) : normalized,
        textContent: kind === 'text' ? normalized : undefined,
        urlContent: kind === 'url' ? normalized : undefined,
      })
    } catch (err) {
      console.warn('create source failed', err)
      throw err
    }
  }, [addSource, createSourceMutation, id])

  const handleCreateFileSource = useCallback(async (file: File) => {
    if (!id) return
    let createdSourceId = ''
    try {
      // Prefer byteLength from content read: File.size can be 0 for some OS/picker paths
      // even when the file has content; backend requires size >= 1.
      const { md5, size } = await hashFile(file)
      if (size < 1) {
        console.warn('skip empty file source', file.name)
        return
      }

      const created = await createSourceMutation.mutateAsync({
        notebookId: id,
        payload: {
          kind: 'file',
        },
      })
      createdSourceId = created.id
      const uploadMimeType = resolveUploadMimeType(file)
      addSource({
        id: created.id,
        kind: 'file',
        status: 'uploading',
        title: file.name,
        fileFormat: uploadMimeType,
      })

      const uploadConfig = await uploadSourceMutation.mutateAsync({
        sourceId: created.id,
        payload: {
          mime_type: uploadMimeType,
          filename: file.name,
          size,
          md5,
        },
      })

      await uploadToObjectStorage(file, uploadConfig)
      setSourceStatus(created.id, 'preparing')
    } catch (err) {
      if (createdSourceId) {
        setSourceStatus(createdSourceId, 'failed')
      } else {
        // 请求层已经提示过 API 错误；这里补上非 API 失败，同一段文案会自动去重。
        showAppToast({
          message: apiErrorMessage(err, 'workspace:error.addFileFailed'),
        })
      }
      console.warn('create file source failed', err)
    }
  }, [addSource, createSourceMutation, id, setSourceStatus, uploadSourceMutation])

  const handleCreateFileSources = useCallback(async (files: File[]) => {
    await Promise.all(
      files.map(async (file) => {
        await handleCreateFileSource(file)
      }),
    )
  }, [handleCreateFileSource])

  const handleCreateUrlSource = useCallback(
    (url: string) => handleCreateSimpleSource('url', url),
    [handleCreateSimpleSource],
  )

  const handleCreateTextSource = useCallback(
    (text: string) => handleCreateSimpleSource('text', text),
    [handleCreateSimpleSource],
  )

  const handleDeleteSource = useCallback(async (sourceId: string) => {
    if (!sourceId) return
    if (removingSourceIds[sourceId]) return

    try {
      await deleteSourceMutation.mutateAsync(sourceId)
      setRemovingSourceIds((prev) => ({
        ...prev,
        [sourceId]: true,
      }))
      const timerId = window.setTimeout(() => {
        removeSource(sourceId)
        setSelectedSourceIds((prev) => {
          if (!prev[sourceId]) return prev
          const next = { ...prev }
          delete next[sourceId]
          return next
        })
        setRemovingSourceIds((prev) => {
          if (!prev[sourceId]) return prev
          const next = { ...prev }
          delete next[sourceId]
          return next
        })
        removeSourceTimersRef.current = removeSourceTimersRef.current.filter(
          (activeTimerId) => activeTimerId !== timerId,
        )
      }, sourceRemoveAnimationMs)
      removeSourceTimersRef.current.push(timerId)
    } catch (err) {
      console.warn('delete source failed', sourceId, err)
    }
  }, [deleteSourceMutation, removeSource, removingSourceIds])

  const handleRetrySource = useCallback(async (sourceId: string) => {
    if (!sourceId) return
    if (removingSourceIds[sourceId]) return

    const targetSource = sources.find((source) => source.id === sourceId)
    if (!targetSource || targetSource.status !== 'failed') {
      return
    }

    try {
      await retrySourceMutation.mutateAsync(sourceId)
      // move failed source back to polling pipeline.
      setSourceStatus(sourceId, 'preparing')
    } catch (err) {
      console.warn('retry source preparation failed', sourceId, err)
    }
  }, [removingSourceIds, retrySourceMutation, setSourceStatus, sources])

  const handleRenameSourceTitle = useCallback(async (sourceId: string, nextTitle: string) => {
    const normalizedTitle = nextTitle.trim()
    if (!normalizedTitle) {
      return
    }

    const source = sources.find((item) => item.id === sourceId)
    if (!source) {
      return
    }

    const prevTitle = source.title ?? ''
    if (prevTitle === normalizedTitle) {
      return
    }

    patchSource(sourceId, { title: normalizedTitle })
    try {
      await updateSourceTitleMutation.mutateAsync({
        sourceId,
        title: normalizedTitle,
      })
    } catch (error) {
      patchSource(sourceId, { title: prevTitle })
      console.warn('update source title failed', sourceId, error)
      throw error
    }
  }, [patchSource, sources, updateSourceTitleMutation])

  const displayNotebookName = useMemo(
    () =>
      resolveNotebookWorkspaceTitle({
        isEditing: false,
        draftName: '',
        storeName: notebookMeta.name,
        queryName: notebookQuery.data?.name,
      }),
    [notebookMeta.name, notebookQuery.data?.name],
  )

  // 仅笔记本名有值时改标签；空名 / 找不到页保持默认 GoNoteLM。
  useDocumentTitle(displayNotebookName.trim() || null, !notebookNotFound)

  const handleNotebookNameCommit = useCallback((rawName: string) => {
    if (!id) {
      return
    }

    const currentName = notebookQuery.data?.name ?? notebookMeta.name
    const nextName = rawName.trim()
    if (!nextName || nextName === currentName) {
      // No-op commit: avoid re-rendering Chat/Studio just to exit edit mode.
      return
    }

    // Header already left edit mode locally; defer store/query fan-out.
    startTransition(() => {
      queryClient.setQueryData<Notebook>(['notebook', id], (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          name: nextName,
        }
      })
      patchNotebookMeta({ name: nextName })
    })

    void updateNotebookNameMutation
      .mutateAsync({
        notebookId: id,
        name: nextName,
      })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
      })
      .catch((error) => {
        startTransition(() => {
          queryClient.setQueryData<Notebook>(['notebook', id], (prev) => {
            if (!prev) return prev
            return {
              ...prev,
              name: currentName,
            }
          })
          patchNotebookMeta({ name: currentName })
        })
        console.warn('update notebook name failed', error)
      })
  }, [
    id,
    notebookMeta.name,
    notebookQuery.data?.name,
    patchNotebookMeta,
    queryClient,
    updateNotebookNameMutation,
  ])

  // 对话面板把菜单需要的状态回报上来；字段一致时保持原引用，避免无谓重渲染。
  const handleChatPanelActionStateChange = useCallback((next: ChatPanelActionState) => {
    setChatPanelActionState((prev) =>
      prev.hasChatId === next.hasChatId
      && prev.isClearingContext === next.isClearingContext
      && prev.isStreaming === next.isStreaming
        ? prev
        : next,
    )
  }, [])

  const handleConfigureChat = useCallback(() => {
    chatPanelActionsRef.current?.openSettings()
  }, [])

  const handleRefreshChat = useCallback(() => {
    chatPanelActionsRef.current?.refreshConversation()
  }, [])

  const handleOpenSharingDialog = useCallback(() => {
    if (!isNotebookOwner) {
      return
    }
    setIsSharingDialogOpen(true)
  }, [isNotebookOwner])

  const handleCloseSharingDialog = useCallback(() => {
    setIsSharingDialogOpen(false)
  }, [])

  const notebookFavouriteFolders = useMemo(
    () => notebookQuery.data?.favourite?.favourites ?? [],
    [notebookQuery.data?.favourite?.favourites],
  )
  const notebookFavouriteIds = useMemo(
    () => notebookFavouriteFolders.map((item) => item.id).filter(Boolean),
    [notebookFavouriteFolders],
  )
  const notebookFavouriteNames = useMemo(
    () => notebookFavouriteFolders.map((item) => item.name).filter(Boolean),
    [notebookFavouriteFolders],
  )
  const isNotebookFavourited = notebookFavouriteIds.length > 0

  const refreshNotebookFavourite = useCallback(async () => {
    if (!id) return
    await queryClient.invalidateQueries({ queryKey: ['notebook', id] })
    await queryClient.invalidateQueries({ queryKey: ['favourites'] })
  }, [id, queryClient])

  const handleToggleFavourite = useCallback(async () => {
    if (!id || isFavouriteToggling) return
    if (!isNotebookFavourited) {
      setIsAddToFavouriteDialogOpen(true)
      return
    }
    setIsFavouriteToggling(true)
    try {
      await Promise.all(
        notebookFavouriteIds.map((favouriteId) =>
          removeFavouriteNotebooks(favouriteId, { notebook_ids: [id] }),
        ),
      )
      queryClient.setQueryData<Notebook>(['notebook', id], (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          favourite: { favourites: [] },
        }
      })
      await queryClient.invalidateQueries({ queryKey: ['favourites'] })
      showAppToast({
        message: i18n.t('favourites:detail.removed'),
        severity: 'success',
      })
    } finally {
      setIsFavouriteToggling(false)
    }
  }, [
    id,
    isFavouriteToggling,
    isNotebookFavourited,
    notebookFavouriteIds,
    queryClient,
  ])

  const handleOpenCustomizeNotebookDialog = useCallback(() => {
    if (!canManageNotebook) {
      return
    }
    setIsCustomizeNotebookDialogOpen(true)
  }, [canManageNotebook])

  const handleCloseCustomizeNotebookDialog = useCallback(() => {
    setIsCustomizeNotebookDialogOpen(false)
  }, [])

  const handleCustomizeNotebookSaved = useCallback(
    (next: { name: string; desc: string; customizeDescription: boolean }) => {
      patchNotebookMeta({
        name: next.name,
        desc: next.desc,
        customizeDescription: next.customizeDescription,
      })
      // 作废在途 generation，避免旧结果写回本地 AI 草稿。
      notebookDescGenEpochRef.current += 1
      if (next.customizeDescription) {
        // 自定义生效后本地 AI 草稿不再展示。
        setAiNotebookDescription('')
        autoDescAttemptedForVisitRef.current = true
        setIsGeneratingNotebookDescription(false)
        return
      }
      // 关掉自定义：立刻切到 AI 展示路径；清旧草稿并允许自动生成 effect 再跑一次。
      // 无 sources 时不预亮 loading、不打 generation（effect 内也会跳过）。
      setAiNotebookDescription('')
      autoDescAttemptedForVisitRef.current = false
      const activeSources = sources.filter((source) => !removingSourceIds[source.id])
      if (activeSources.length === 0) {
        setIsGeneratingNotebookDescription(false)
        return
      }
      const hasReady = activeSources.some((source) => source.status === 'ready')
      const hasNonTerminal = activeSources.some(
        (source) => source.status !== 'ready' && source.status !== 'failed',
      )
      if (hasReady && !hasNonTerminal) {
        setIsGeneratingNotebookDescription(true)
      }
      // 若仍有 in-flight，effect 可能提前 return；依赖 nudge + finally 里的二次 nudge。
      setNotebookDescGenNudge((n) => n + 1)
    },
    [patchNotebookMeta, removingSourceIds, sources],
  )

  const displayNotebookDescription = notebookMeta.customizeDescription
    ? notebookMeta.desc
    : aiNotebookDescription

  const chatMenu = useMemo<WorkspaceHeaderChatMenu>(
    () => ({
      refreshDisabled:
        !chatPanelActionState.hasChatId
        || chatPanelActionState.isClearingContext
        || chatPanelActionState.isStreaming,
      isRefreshing: chatPanelActionState.isClearingContext,
      onConfigureChat: handleConfigureChat,
      onRefreshChat: handleRefreshChat,
    }),
    [chatPanelActionState, handleConfigureChat, handleRefreshChat],
  )

  const getLeftPanelWidthBounds = useCallback(
    (containerWidth: number, rightPanelWidth: number, rightPanelCollapsed: boolean) => {
      const maxByRatio = Math.floor(containerWidth * workspacePanelMaxWidthRatio)
      const rightVisibleWidth = rightPanelCollapsed
        ? collapsedPanelRailWidthPx
        : rightPanelWidth
      const rightHandleWidth = rightPanelCollapsed ? 0 : workspaceResizeHandleWidthPx
      const maxByCenter =
        containerWidth -
        workspaceCenterMinWidthPx -
        rightVisibleWidth -
        rightHandleWidth -
        workspaceResizeHandleWidthPx
      const maxWidth = Math.max(0, Math.min(maxByRatio, maxByCenter))
      const minWidth = Math.min(workspacePanelMinWidthPx, maxWidth)
      return { minWidth, maxWidth }
    },
    [],
  )

  const getRightPanelWidthBounds = useCallback(
    (containerWidth: number, leftPanelWidth: number, leftPanelCollapsed: boolean) => {
      const maxByRatio = Math.floor(containerWidth * workspacePanelMaxWidthRatio)
      const leftVisibleWidth = leftPanelCollapsed
        ? collapsedPanelRailWidthPx
        : leftPanelWidth
      const leftHandleWidth = leftPanelCollapsed ? 0 : workspaceResizeHandleWidthPx
      const maxByCenter =
        containerWidth -
        workspaceCenterMinWidthPx -
        leftVisibleWidth -
        leftHandleWidth -
        workspaceResizeHandleWidthPx
      const maxWidth = Math.max(0, Math.min(maxByRatio, maxByCenter))
      const minWidth = Math.min(workspacePanelMinWidthPx, maxWidth)
      return { minWidth, maxWidth }
    },
    [],
  )

  useEffect(() => {
    if (workspaceContainerWidthPx <= 0) {
      return
    }

    let nextSourcesCollapsed = isSourcesPanelCollapsed
    let nextInsightsCollapsed = isInsightsPanelCollapsed
    const nextSourcesWidth = Math.round(sourcesPanelWidthPx)
    const nextInsightsWidth = Math.round(insightsPanelWidthPx)

    for (let i = 0; i < 2; i += 1) {
      if (!nextSourcesCollapsed) {
        const leftBounds = getLeftPanelWidthBounds(
          workspaceContainerWidthPx,
          nextInsightsWidth,
          nextInsightsCollapsed,
        )
        if (leftBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
          nextSourcesCollapsed = true
        }
      }

      if (!nextInsightsCollapsed) {
        const rightBounds = getRightPanelWidthBounds(
          workspaceContainerWidthPx,
          nextSourcesWidth,
          nextSourcesCollapsed,
        )
        if (rightBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
          nextInsightsCollapsed = true
        }
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyPanelSizingState({
      nextSourcesCollapsed,
      nextInsightsCollapsed,
      nextSourcesWidth,
      nextInsightsWidth,
    })
  }, [
    applyPanelSizingState,
    getLeftPanelWidthBounds,
    getRightPanelWidthBounds,
    insightsPanelWidthPx,
    isInsightsPanelCollapsed,
    isSourcesPanelCollapsed,
    sourcesPanelWidthPx,
    workspaceContainerWidthPx,
  ])

  /**
   * 大屏自适应：窗口跨屏/放大时按容器比例同步放大两侧面板。
   * 否则中间 chat 区会被拉宽，而聊天内容列有最大宽度，两侧会出现大片空白。
   * - 首次测量：以 1440 为设计基准推导；
   * - 后续：按容器变化比例缩放，并受拖动边界约束；
   * - 小于 32px 的抖动忽略，避免窗口拖拽过程中频繁重排。
   */
  const lastPanelScaleContainerWidthRef = useRef(0)
  useEffect(() => {
    if (workspaceContainerWidthPx <= 0) {
      return
    }

    const lastWidth = lastPanelScaleContainerWidthRef.current
    if (lastWidth === 0) {
      // 首帧宽度已按视口换算好，首次测量只记录，不再二次缩放。
      lastPanelScaleContainerWidthRef.current = workspaceContainerWidthPx
      return
    }
    if (Math.abs(workspaceContainerWidthPx - lastWidth) < 32) {
      return
    }

    const ratio = workspaceContainerWidthPx / lastWidth
    if (Math.abs(ratio - 1) < 0.01) {
      lastPanelScaleContainerWidthRef.current = workspaceContainerWidthPx
      return
    }

    let nextSourcesWidth = Math.round(sourcesPanelWidthPx * ratio)
    let nextInsightsWidth = Math.round(insightsPanelWidthPx * ratio)

    const leftBounds = getLeftPanelWidthBounds(
      workspaceContainerWidthPx,
      nextInsightsWidth,
      isInsightsPanelCollapsed,
    )
    nextSourcesWidth = Math.min(
      leftBounds.maxWidth,
      Math.max(leftBounds.minWidth, nextSourcesWidth),
    )
    const rightBounds = getRightPanelWidthBounds(
      workspaceContainerWidthPx,
      nextSourcesWidth,
      isSourcesPanelCollapsed,
    )
    nextInsightsWidth = Math.min(
      rightBounds.maxWidth,
      Math.max(rightBounds.minWidth, nextInsightsWidth),
    )

    lastPanelScaleContainerWidthRef.current = workspaceContainerWidthPx
    if (
      nextSourcesWidth === Math.round(sourcesPanelWidthPx)
      && nextInsightsWidth === Math.round(insightsPanelWidthPx)
    ) {
      return
    }

    applyPanelSizingState({
      nextSourcesCollapsed: isSourcesPanelCollapsed,
      nextInsightsCollapsed: isInsightsPanelCollapsed,
      nextSourcesWidth,
      nextInsightsWidth,
    })
  }, [
    applyPanelSizingState,
    getLeftPanelWidthBounds,
    getRightPanelWidthBounds,
    insightsPanelWidthPx,
    isInsightsPanelCollapsed,
    isSourcesPanelCollapsed,
    sourcesPanelWidthPx,
    workspaceContainerWidthPx,
  ])

  const startResizePanel = useCallback(
    (side: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      const container = workspacePanelsRef.current
      if (!container) return

      event.preventDefault()

      // Keep the first pointerdown frame free of React commits (heavy markdown re-render
      // was making the drag feel sticky). Drive chrome + grid via DOM only until pointerup.
      const activeHandle =
        side === 'left' ? leftResizeHandleRef.current : rightResizeHandleRef.current
      const previousUserSelect = document.body.style.userSelect
      const previousCursor = document.body.style.cursor
      const previousTransition = container.style.transition
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
      container.style.transition = 'none'
      activeHandle?.setAttribute('data-resize-active', 'true')

      const initialRect = container.getBoundingClientRect()
      const containerWidth = initialRect.width
      if (containerWidth <= 0) {
        document.body.style.userSelect = previousUserSelect
        document.body.style.cursor = previousCursor
        container.style.transition = previousTransition
        activeHandle?.removeAttribute('data-resize-active')
        return
      }
      let nextSourcesCollapsed = sourcesPanelCollapsedRef.current
      let nextInsightsCollapsed = insightsPanelCollapsedRef.current
      let nextSourcesWidth = Math.round(sourcesPanelWidthRef.current)
      let nextInsightsWidth = Math.round(insightsPanelWidthRef.current)
      let latestClientX = event.clientX
      let resizeFrameId: number | null = null

      const applyResizeByClientX = (clientX: number) => {
        if (side === 'left') {
          const rawLeftWidth = clientX - initialRect.left
          if (rawLeftWidth <= workspacePanelAutoCollapseWidthPx) {
            if (!nextSourcesCollapsed) {
              nextSourcesCollapsed = true
              applyWorkspacePanelGridColumns(container, {
                sourcesCollapsed: nextSourcesCollapsed,
                insightsCollapsed: nextInsightsCollapsed,
                sourcesWidth: nextSourcesWidth,
                insightsWidth: nextInsightsWidth,
              })
            }
            return
          }

          const leftBounds = getLeftPanelWidthBounds(
            containerWidth,
            nextInsightsWidth,
            nextInsightsCollapsed,
          )
          if (leftBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
            if (!nextSourcesCollapsed) {
              nextSourcesCollapsed = true
              applyWorkspacePanelGridColumns(container, {
                sourcesCollapsed: nextSourcesCollapsed,
                insightsCollapsed: nextInsightsCollapsed,
                sourcesWidth: nextSourcesWidth,
                insightsWidth: nextInsightsWidth,
              })
            }
            return
          }

          const nextLeftWidth = Math.round(
            clampNumber(rawLeftWidth, leftBounds.minWidth, leftBounds.maxWidth),
          )

          if (nextSourcesCollapsed || nextSourcesWidth !== nextLeftWidth) {
            nextSourcesCollapsed = false
            nextSourcesWidth = nextLeftWidth
            applyWorkspacePanelGridColumns(container, {
              sourcesCollapsed: nextSourcesCollapsed,
              insightsCollapsed: nextInsightsCollapsed,
              sourcesWidth: nextSourcesWidth,
              insightsWidth: nextInsightsWidth,
            })
          }
          return
        }

        const rawRightWidth = initialRect.right - clientX
        if (rawRightWidth <= workspacePanelAutoCollapseWidthPx) {
          if (!nextInsightsCollapsed) {
            nextInsightsCollapsed = true
            applyWorkspacePanelGridColumns(container, {
              sourcesCollapsed: nextSourcesCollapsed,
              insightsCollapsed: nextInsightsCollapsed,
              sourcesWidth: nextSourcesWidth,
              insightsWidth: nextInsightsWidth,
            })
          }
          return
        }

        const rightBounds = getRightPanelWidthBounds(
          containerWidth,
          nextSourcesWidth,
          nextSourcesCollapsed,
        )
        if (rightBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
          if (!nextInsightsCollapsed) {
            nextInsightsCollapsed = true
            applyWorkspacePanelGridColumns(container, {
              sourcesCollapsed: nextSourcesCollapsed,
              insightsCollapsed: nextInsightsCollapsed,
              sourcesWidth: nextSourcesWidth,
              insightsWidth: nextInsightsWidth,
            })
          }
          return
        }
        const nextRightWidth = Math.round(
          clampNumber(rawRightWidth, rightBounds.minWidth, rightBounds.maxWidth),
        )

        if (nextInsightsCollapsed || nextInsightsWidth !== nextRightWidth) {
          nextInsightsCollapsed = false
          nextInsightsWidth = nextRightWidth
          applyWorkspacePanelGridColumns(container, {
            sourcesCollapsed: nextSourcesCollapsed,
            insightsCollapsed: nextInsightsCollapsed,
            sourcesWidth: nextSourcesWidth,
            insightsWidth: nextInsightsWidth,
          })
        }
      }

      const scheduleResizeFrame = () => {
        if (resizeFrameId !== null) {
          return
        }
        resizeFrameId = window.requestAnimationFrame(() => {
          resizeFrameId = null
          applyResizeByClientX(latestClientX)
        })
      }

      const onPointerMove = (moveEvent: PointerEvent) => {
        latestClientX = moveEvent.clientX
        scheduleResizeFrame()
      }

      const stopResize = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', stopResize)
        window.removeEventListener('pointercancel', stopResize)
        if (resizeFrameId !== null) {
          window.cancelAnimationFrame(resizeFrameId)
          resizeFrameId = null
        }
        applyResizeByClientX(latestClientX)
        document.body.style.userSelect = previousUserSelect
        document.body.style.cursor = previousCursor
        container.style.transition = previousTransition
        activeHandle?.removeAttribute('data-resize-active')
        sourcesPanelCollapsedRef.current = nextSourcesCollapsed
        insightsPanelCollapsedRef.current = nextInsightsCollapsed
        sourcesPanelWidthRef.current = nextSourcesWidth
        insightsPanelWidthRef.current = nextInsightsWidth
        setIsSourcesPanelCollapsed(nextSourcesCollapsed)
        setIsInsightsPanelCollapsed(nextInsightsCollapsed)
        setSourcesPanelWidthPx(nextSourcesWidth)
        setInsightsPanelWidthPx(nextInsightsWidth)
        if (stopPanelResizeRef.current === stopResize) {
          stopPanelResizeRef.current = null
        }
      }

      stopPanelResizeRef.current = stopResize
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', stopResize)
      window.addEventListener('pointercancel', stopResize)
      // First paint follows the pointer immediately (no waiting for the next move/rAF).
      applyResizeByClientX(latestClientX)
    },
    [getLeftPanelWidthBounds, getRightPanelWidthBounds],
  )

  const startResizeLeftPanel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      startResizePanel('left')(event)
    },
    [startResizePanel],
  )

  const startResizeRightPanel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      startResizePanel('right')(event)
    },
    [startResizePanel],
  )

  const handleCollapseSourcesPanel = useCallback(() => {
    sourcesPanelCollapsedRef.current = true
    syncWorkspacePanelGridFromRefs({ sourcesCollapsed: true })
    schedulePanelLayoutReactCommit()
  }, [schedulePanelLayoutReactCommit, syncWorkspacePanelGridFromRefs])

  const handleCollapseInsightsPanel = useCallback(() => {
    insightsPanelCollapsedRef.current = true
    syncWorkspacePanelGridFromRefs({ insightsCollapsed: true })
    schedulePanelLayoutReactCommit()
  }, [schedulePanelLayoutReactCommit, syncWorkspacePanelGridFromRefs])

  const handleExpandSourcesPanel = useCallback(() => {
    if (isMobileWorkspace) {
      setMobileActivePanel('sources')
      return
    }
    const containerWidth =
      workspaceContainerWidthPx || workspacePanelsRef.current?.getBoundingClientRect().width || 0
    const preferredWidth =
      sourcesPanelWidthRef.current > 0
        ? sourcesPanelWidthRef.current
        : workspaceSourcesPanelDefaultWidthPx
    if (containerWidth <= 0) {
      sourcesPanelCollapsedRef.current = false
      sourcesPanelWidthRef.current = preferredWidth
      syncWorkspacePanelGridFromRefs({
        sourcesCollapsed: false,
        sourcesWidth: preferredWidth,
      })
      schedulePanelLayoutReactCommit()
      return
    }

    const leftBounds = getLeftPanelWidthBounds(
      containerWidth,
      insightsPanelWidthRef.current,
      insightsPanelCollapsedRef.current,
    )
    if (leftBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
      return
    }

    const nextWidth = Math.round(
      clampNumber(preferredWidth, leftBounds.minWidth, leftBounds.maxWidth),
    )
    sourcesPanelCollapsedRef.current = false
    sourcesPanelWidthRef.current = nextWidth
    syncWorkspacePanelGridFromRefs({
      sourcesCollapsed: false,
      sourcesWidth: nextWidth,
    })
    schedulePanelLayoutReactCommit()
  }, [
    getLeftPanelWidthBounds,
    isMobileWorkspace,
    schedulePanelLayoutReactCommit,
    syncWorkspacePanelGridFromRefs,
    workspaceContainerWidthPx,
  ])

  const handleExpandInsightsPanel = useCallback(() => {
    if (isMobileWorkspace) {
      setMobileActivePanel('studio')
      return
    }
    const containerWidth =
      workspaceContainerWidthPx || workspacePanelsRef.current?.getBoundingClientRect().width || 0
    const preferredWidth =
      insightsPanelWidthRef.current > 0
        ? insightsPanelWidthRef.current
        : workspaceInsightsPanelDefaultWidthPx
    if (containerWidth <= 0) {
      insightsPanelCollapsedRef.current = false
      insightsPanelWidthRef.current = preferredWidth
      syncWorkspacePanelGridFromRefs({
        insightsCollapsed: false,
        insightsWidth: preferredWidth,
      })
      schedulePanelLayoutReactCommit()
      return
    }

    const rightBounds = getRightPanelWidthBounds(
      containerWidth,
      sourcesPanelWidthRef.current,
      sourcesPanelCollapsedRef.current,
    )
    if (rightBounds.maxWidth <= workspacePanelAutoCollapseWidthPx) {
      return
    }

    const nextWidth = Math.round(
      clampNumber(preferredWidth, rightBounds.minWidth, rightBounds.maxWidth),
    )
    insightsPanelCollapsedRef.current = false
    insightsPanelWidthRef.current = nextWidth
    syncWorkspacePanelGridFromRefs({
      insightsCollapsed: false,
      insightsWidth: nextWidth,
    })
    schedulePanelLayoutReactCommit()
  }, [
    getRightPanelWidthBounds,
    isMobileWorkspace,
    schedulePanelLayoutReactCommit,
    syncWorkspacePanelGridFromRefs,
    workspaceContainerWidthPx,
  ])

  const handleOpenCitationJump = useCallback((request: ChatCitationJumpRequest) => {
    setMobileActivePanel('sources')
    handleExpandSourcesPanel()
    citationPreviewRequestSeqRef.current += 1
    setCitationPreviewRequest({
      ...request,
      requestId: citationPreviewRequestSeqRef.current,
    })
  }, [handleExpandSourcesPanel])

  const handleRegisterSaveMessageAsNote = useCallback(
    (handler: ((params: SaveMessageAsNoteParams) => Promise<void>) | null) => {
      saveMessageAsNoteRef.current = handler
    },
    [],
  )

  const handleSaveMessageAsNote = useCallback(async (params: SaveMessageAsNoteParams) => {
    const handler = saveMessageAsNoteRef.current
    if (!handler) {
      throw new Error(i18n.t('workspace:error.notReady'))
    }
    await handler(params)
  }, [])

  if (notebookNotFound) {
    return (
      <NotebookNotFoundPage
        isRetrying={notebookQuery.isFetching}
        onRetry={() => {
          void notebookQuery.refetch()
        }}
      />
    )
  }

  return (
    <Box
      sx={{
        height: '100vh',
        '@supports (height: 100dvh)': {
          height: '100dvh',
        },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <SourceSelectionController
        notebookId={id}
        sourceListItems={sourceListItems}
        selectableSourceItems={selectableSourceItems}
        selectedSourceIds={selectedSourceIds}
        isHydratingSources={isHydratingSources}
        onSelectedSourceIdsChange={setSelectedSourceIds}
      />
      <WorkspaceHeader
        notebookName={displayNotebookName}
        isFetching={notebookQuery.isFetching}
        isUpdatingName={updateNotebookNameMutation.isPending}
        isPublic={notebookQuery.data?.visibility === 'public'}
        onNotebookNameCommit={handleNotebookNameCommit}
        canRenameNotebook={canManageNotebook}
        onShareNotebook={isNotebookOwner ? handleOpenSharingDialog : undefined}
        onCustomizeNotebook={
          canManageNotebook ? handleOpenCustomizeNotebookDialog : undefined
        }
        onAddToFavourite={
          id ? () => setIsAddToFavouriteDialogOpen(true) : undefined
        }
        onToggleFavourite={id ? () => {
          void handleToggleFavourite()
        } : undefined}
        isFavourited={isNotebookFavourited}
        favouriteNames={notebookFavouriteNames}
        favouriteBusy={isFavouriteToggling}
        chatMenu={chatMenu}
      />
      <AddToFavouriteDialog
        open={isAddToFavouriteDialogOpen}
        notebookId={id ?? null}
        onClose={() => setIsAddToFavouriteDialogOpen(false)}
        onAdded={() => {
          void refreshNotebookFavourite()
        }}
      />
      {isNotebookOwner ? (
        <NotebookSharingDialog
          notebookId={id}
          notebookName={displayNotebookName}
          open={isSharingDialogOpen}
          onClose={handleCloseSharingDialog}
        />
      ) : null}
      {canManageNotebook && id && isCustomizeNotebookDialogOpen ? (
        <CustomizeNotebookDialog
          notebookId={id}
          open
          notebookName={
            (notebookQuery.data?.name ?? notebookMeta.name).trim() || displayNotebookName
          }
          description={notebookMeta.desc}
          customizeDescription={notebookMeta.customizeDescription}
          coverUrl={notebookMeta.coverUrl}
          onCoverChange={(nextCoverUrl) => {
            patchNotebookMeta({ coverUrl: nextCoverUrl ?? undefined })
          }}
          onClose={handleCloseCustomizeNotebookDialog}
          onSaved={handleCustomizeNotebookSaved}
        />
      ) : null}

      <Box
        sx={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          px: { xs: 0, md: workspaceSpace.sm },
          py: { xs: 0, md: workspaceSpace.sm },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <Box
          ref={workspacePanelsRef}
          sx={{
            display: 'grid',
            gap: 0,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            gridTemplateColumns: {
              xs: '1fr',
              md: `var(${workspaceSourcesColumnVar}, ${Math.round(sourcesPanelWidthPx)}px) var(${workspaceLeftHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) minmax(${workspaceCenterMinWidthPx}px, 1fr) var(${workspaceRightHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) var(${workspaceInsightsColumnVar}, ${Math.round(insightsPanelWidthPx)}px)`,
              xl: `var(${workspaceSourcesColumnVar}, ${Math.round(sourcesPanelWidthPx)}px) var(${workspaceLeftHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) minmax(${workspaceCenterMinWidthPx}px, 1fr) var(${workspaceRightHandleColumnVar}, ${workspaceResizeHandleWidthPx}px) var(${workspaceInsightsColumnVar}, ${Math.round(insightsPanelWidthPx)}px)`,
            },
            gridTemplateRows: 'minmax(0, 1fr)',
            transition: workspacePanelGridTransition,
            '& > *': {
              minWidth: 0,
              minHeight: 0,
            },
          }}
        >
          <Box
            sx={{
              display: {
                xs: mobileActivePanel === 'sources' ? 'flex' : 'none',
                md: 'block',
              },
              height: '100%',
              minHeight: 0,
              flexDirection: 'column',
            }}
          >
            <SourcesPanel
              collapsed={isMobileWorkspace ? false : isSourcesPanelCollapsed}
              isBusy={isBusy}
              isHydrating={isHydratingSources}
              isPanelResizing={isPanelLayoutAnimating}
              loadingSkeletonCount={notebookQuery.data?.source_count ?? 0}
              sourceListItems={sourceListItems}
              removingMap={removingSourceIds}
              allSourcesChecked={allSourcesChecked}
              someSourcesChecked={someSourcesChecked}
              onCollapse={handleCollapseSourcesPanel}
              onExpand={handleExpandSourcesPanel}
              canManageContent={canManageContent}
              onCreateFile={handleCreateFileSources}
              onCreateUrl={handleCreateUrlSource}
              onCreateText={handleCreateTextSource}
              onToggleAll={toggleAllSourceChecked}
              onToggleItem={toggleSourceItemChecked}
              onDeleteItem={handleDeleteSource}
              onRetryItem={handleRetrySource}
              onRenameItem={handleRenameSourceTitle}
              checkedMap={selectedSourceIds}
              previewRequest={citationPreviewRequest}
            />
          </Box>

          <Box
            ref={leftResizeHandleRef}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('resize.sourcesAria')}
            onPointerDown={startResizeLeftPanel}
            sx={{
              display: { xs: 'none', md: 'block' },
              cursor: isSourcesPanelCollapsed ? 'default' : 'col-resize',
              touchAction: 'none',
              pointerEvents: isSourcesPanelCollapsed ? 'none' : 'auto',
              opacity: isSourcesPanelCollapsed ? 0 : 1,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 2,
                // Pill shape for resize handle hit affordance (not card radius).
                borderRadius: 999,
                transform: 'translateX(-50%)',
                bgcolor: 'divider',
                transition: workspaceTransitionPresets.backgroundOnly,
              },
              '&:hover::before': {
                bgcolor: 'text.secondary',
              },
              '&[data-resize-active="true"]::before, &[data-resize-active="true"]:hover::before': {
                bgcolor: 'primary.main',
              },
            }}
          />

          <Box
            sx={{
              display: {
                xs: mobileActivePanel === 'chat' ? 'flex' : 'none',
                md: 'block',
              },
              height: '100%',
              minHeight: 0,
              flexDirection: 'column',
            }}
          >
            <ChatPanel
              notebookId={id}
              chatId={notebookChatQuery.data?.chat_id ?? ''}
              notebookName={displayNotebookName}
              notebookDescription={displayNotebookDescription}
              notebookSourceCount={notebookMeta.sourceCount}
              notebookCreatedAt={
                notebookQuery.data?.created_at && notebookQuery.data.created_at > 0
                  ? notebookQuery.data.created_at
                  : notebookQuery.data?.updated_at
              }
              notebookCoverUrl={notebookMeta.coverUrl}
              notebookOwner={notebookOwnerForHeader}
              customizeDescription={notebookMeta.customizeDescription}
              notebookDescriptionLoading={isGeneratingNotebookDescription}
              selectedSourceIds={deferredSelectedSourceIdList}
              readySourceIds={readySourceIdList}
              sourcesPanelCollapsed={isSourcesPanelCollapsed}
              insightsPanelCollapsed={isInsightsPanelCollapsed}
              onExpandSourcesPanel={handleExpandSourcesPanel}
              onExpandInsightsPanel={handleExpandInsightsPanel}
              onOpenCitationJump={handleOpenCitationJump}
              onSaveMessageAsNote={
                canManageContent ? handleSaveMessageAsNote : undefined
              }
              actionsRef={chatPanelActionsRef}
              onActionStateChange={handleChatPanelActionStateChange}
            />
          </Box>

          <Box
            ref={rightResizeHandleRef}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('resize.rightAria')}
            onPointerDown={startResizeRightPanel}
            sx={{
              display: { xs: 'none', md: 'block' },
              cursor: isInsightsPanelCollapsed ? 'default' : 'col-resize',
              touchAction: 'none',
              pointerEvents: isInsightsPanelCollapsed ? 'none' : 'auto',
              opacity: isInsightsPanelCollapsed ? 0 : 1,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 2,
                // Pill shape for resize handle hit affordance (not card radius).
                borderRadius: 999,
                transform: 'translateX(-50%)',
                bgcolor: 'divider',
                transition: workspaceTransitionPresets.backgroundOnly,
              },
              '&:hover::before': {
                bgcolor: 'text.secondary',
              },
              '&[data-resize-active="true"]::before, &[data-resize-active="true"]:hover::before': {
                bgcolor: 'primary.main',
              },
            }}
          />

          <Box
            sx={{
              // 列宽由 grid CSS 变量驱动；勿再叠 width/transform，避免与 grid 过渡双重重排
              display: {
                xs: mobileActivePanel === 'studio' ? 'flex' : 'none',
                md: 'block',
              },
              width: '100%',
              height: '100%',
              minWidth: 0,
              overflow: 'hidden',
              contain: 'layout paint',
              pointerEvents: 'auto',
            }}
          >
            <StudioPanel
              notebookId={id}
              selectedSourceIds={deferredSelectedSourceIdList}
              readySourceIds={readySourceIdList}
              canManageContent={canManageContent}
              collapsed={!isMobileWorkspace && isInsightsPanelCollapsed}
              onCollapse={handleCollapseInsightsPanel}
              onExpand={handleExpandInsightsPanel}
              onSourceCreated={handleSourceCreated}
              onRegisterSaveMessageAsNote={handleRegisterSaveMessageAsNote}
            />
          </Box>
        </Box>

        <WorkspaceMobileTabBar
          value={mobileActivePanel}
          onChange={setMobileActivePanel}
        />
      </Box>
    </Box>
  )
}
