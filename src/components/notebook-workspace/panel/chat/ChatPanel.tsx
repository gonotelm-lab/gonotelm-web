import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Box, IconButton, Paper } from '@mui/material'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import { showAppToast } from '@/lib/apiErrorToast'
import { ChatComposer } from './ChatComposer'
import { ChatMessagesList } from './ChatMessagesList'
import { ChatNotebookInfoHeader, type ChatNotebookOwner } from './ChatNotebookInfoHeader'
import { ChatPanelHeader } from './ChatPanelHeader'
import { ChatSettingsDialog } from './ChatSettingsDialog'
import {
  chatAnswerLengthOptionValues,
  chatStyleOptionValues,
  type ChatAnswerLengthOption,
  type ChatStyleOption,
} from './chatSettings'
import type { ChatCitationJumpRequest } from './types'
import { useChatConversation } from './useChatConversation'
import { useChatSuggestions } from './useChatSuggestions'
import { workspaceSpace } from '../../shared/ui/layoutTokens'
import { resolveWorkspaceElevation } from '../../shared/ui/workspaceElevation'
import { chatContentColumnSx, chatPanelLayoutTokens, chatReadableColumnSx } from './layoutTokens'

const scrollToBottomButtonTokens = {
  size: 32,
  marginBottom: workspaceSpace.md,
  zIndex: 2,
}

const chatSettingsStorageKeyPrefix = 'chat-panel-settings'
const defaultChatStyle: ChatStyleOption = 'default'
const defaultChatAnswerLength: ChatAnswerLengthOption = 'default'
const chatStyleOptionSet = new Set<ChatStyleOption>(chatStyleOptionValues)
const chatAnswerLengthOptionSet = new Set<ChatAnswerLengthOption>(chatAnswerLengthOptionValues)

interface PersistedChatPanelSettings {
  style?: string
  answerLength?: string
  enableThinking?: boolean
}

const defaultEnableThinking = false

const buildChatSettingsStorageKey = (chatId: string) =>
  `${chatSettingsStorageKeyPrefix}:${chatId}`

const resolveStoredChatSettings = (
  chatId: string,
): {
  chatStyle: ChatStyleOption
  answerLength: ChatAnswerLengthOption
  enableThinking: boolean
} => {
  if (typeof window === 'undefined' || !chatId) {
    return {
      chatStyle: defaultChatStyle,
      answerLength: defaultChatAnswerLength,
      enableThinking: defaultEnableThinking,
    }
  }
  const persistedSettings = window.localStorage.getItem(buildChatSettingsStorageKey(chatId))
  if (!persistedSettings) {
    return {
      chatStyle: defaultChatStyle,
      answerLength: defaultChatAnswerLength,
      enableThinking: defaultEnableThinking,
    }
  }

  try {
    const parsed = JSON.parse(persistedSettings) as PersistedChatPanelSettings
    const chatStyle = chatStyleOptionSet.has(parsed.style as ChatStyleOption)
      ? (parsed.style as ChatStyleOption)
      : defaultChatStyle
    const answerLength = chatAnswerLengthOptionSet.has(parsed.answerLength as ChatAnswerLengthOption)
      ? (parsed.answerLength as ChatAnswerLengthOption)
      : defaultChatAnswerLength
    const enableThinking =
      typeof parsed.enableThinking === 'boolean' ? parsed.enableThinking : defaultEnableThinking
    return {
      chatStyle,
      answerLength,
      enableThinking,
    }
  } catch {
    return {
      chatStyle: defaultChatStyle,
      answerLength: defaultChatAnswerLength,
      enableThinking: defaultEnableThinking,
    }
  }
}

const persistChatSettings = (
  chatId: string,
  chatStyle: ChatStyleOption,
  answerLength: ChatAnswerLengthOption,
  enableThinking: boolean,
) => {
  if (typeof window === 'undefined' || !chatId) {
    return
  }
  window.localStorage.setItem(
    buildChatSettingsStorageKey(chatId),
    JSON.stringify({
      style: chatStyle,
      answerLength,
      enableThinking,
    }),
  )
}

/**
 * 顶栏“更多选项”菜单要用的两个动作。header 不是对话面板的子节点，
 * 与其把整套会话状态（流式、草稿、滚动控制）上提，不如由面板暴露一个 remote 句柄。
 */
export interface ChatPanelActions {
  openSettings: () => void
  refreshConversation: () => void
}

/** 菜单需要的会话状态快照，用于“刷新对话”的禁用判断与 header spinner。 */
export interface ChatPanelActionState {
  hasChatId: boolean
  isClearingContext: boolean
  isStreaming: boolean
}

interface ChatPanelProps {
  notebookId: string
  chatId: string
  notebookName: string
  notebookDescription: string
  notebookSourceCount: number
  /** 笔记本创建时间（unix ms）；标题下方展示创建日期。 */
  notebookCreatedAt?: number
  /** 已设置封面时：封面作为聊天开场标题背景，owner/标题压在图上。 */
  notebookCoverUrl?: string
  /** 共享笔记本的 owner；自己拥有时不传（不展示）。 */
  notebookOwner?: ChatNotebookOwner
  customizeDescription?: boolean
  notebookDescriptionLoading?: boolean
  selectedSourceIds: string[]
  readySourceIds: string[]
  sourcesPanelCollapsed: boolean
  insightsPanelCollapsed: boolean
  onExpandSourcesPanel: () => void
  onExpandInsightsPanel: () => void
  onOpenCitationJump: (request: ChatCitationJumpRequest) => void
  onSaveMessageAsNote?: (params: { chatId: string; msgId: string }) => Promise<void>
  /** 由上层持有并转交给顶栏“更多选项”菜单。 */
  actionsRef?: Ref<ChatPanelActions>
  /** 把菜单需要的状态同步到上层；上层需传入稳定引用。 */
  onActionStateChange?: (state: ChatPanelActionState) => void
}

export const ChatPanel = memo(function ChatPanel({
  notebookId,
  actionsRef,
  onActionStateChange,
  ...restProps
}: ChatPanelProps) {
  return (
    <ChatPanelContent
      notebookId={notebookId}
      key={`${notebookId}:${restProps.chatId}`}
      actionsRef={actionsRef}
      onActionStateChange={onActionStateChange}
      {...restProps}
    />
  )
})

type ChatPanelContentProps = ChatPanelProps

function ChatPanelContent({
  notebookId,
  chatId,
  notebookName,
  notebookDescription,
  notebookSourceCount,
  notebookCreatedAt,
  notebookCoverUrl,
  notebookOwner,
  customizeDescription = false,
  notebookDescriptionLoading = false,
  selectedSourceIds,
  readySourceIds,
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
  onOpenCitationJump,
  onSaveMessageAsNote,
  actionsRef,
  onActionStateChange,
}: ChatPanelContentProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [savingAsNoteMessageId, setSavingAsNoteMessageId] = useState<string | null>(null)
  const [chatStyle, setChatStyle] = useState<ChatStyleOption>(
    () => resolveStoredChatSettings(chatId).chatStyle,
  )
  const [answerLength, setAnswerLength] = useState<ChatAnswerLengthOption>(
    () => resolveStoredChatSettings(chatId).answerLength,
  )
  const [enableThinking, setEnableThinking] = useState(
    () => resolveStoredChatSettings(chatId).enableThinking,
  )
  const chatInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const wasStreamingRef = useRef(false)

  const { suggestions, fetchFollowup } = useChatSuggestions({
    chatId,
    readySourceIds,
    selectedSourceIds,
  })

  const {
    displayMessages,
    isLoadingHistory,
    isFetchingMore,
    isStreaming,
    activeAssistantMessageId,
    copiedUserMessageId,
    errorText,
    isClearingContext,
    showScrollToBottomButton,
    canSubmit,
    isInputDisabled,
    isAbortDisabled,
    isThinkingToggleDisabled,
    messageListRef,
    composerRestoreNonce,
    composerRestoreValue,
    onMessageListScroll,
    onCopyUserMessage,
    onSendMessage,
    onAbortStream,
    onClearCurrentContext,
    smoothScrollToBottom,
    sendPrompt,
  } = useChatConversation({
    chatId,
    selectedSourceIds,
    chatStyle,
    answerLength,
    enableThinking,
    onStreamCompleted: fetchFollowup,
  })

  const handleOpenSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(true)
  }, [])

  // 顶栏“更多选项”菜单的远程入口：菜单项与面板内原按钮走同一套回调。
  useImperativeHandle(
    actionsRef,
    () => ({
      openSettings: handleOpenSettingsDialog,
      refreshConversation: onClearCurrentContext,
    }),
    [handleOpenSettingsDialog, onClearCurrentContext],
  )

  const chatActionState = useMemo<ChatPanelActionState>(
    () => ({
      hasChatId: Boolean(chatId),
      isClearingContext,
      isStreaming,
    }),
    [chatId, isClearingContext, isStreaming],
  )

  // 经 ref 转发，避免上层传入的回调换引用时反复向上回报。
  const onActionStateChangeRef = useRef(onActionStateChange)
  useEffect(() => {
    onActionStateChangeRef.current = onActionStateChange
  }, [onActionStateChange])
  useEffect(() => {
    onActionStateChangeRef.current?.(chatActionState)
  }, [chatActionState])

  const handleCloseSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(false)
  }, [])

  const handleSaveSettings = useCallback(() => {
    setSettingsDialogOpen(false)
  }, [])

  const composerInteractionState = useMemo(
    () => ({
      isStreaming,
      isInputDisabled,
      isAbortDisabled,
    }),
    [isAbortDisabled, isInputDisabled, isStreaming],
  )

  useEffect(() => {
    const wasStreaming = wasStreamingRef.current
    wasStreamingRef.current = isStreaming
    if (!wasStreaming || isStreaming || isInputDisabled) {
      return
    }
    window.requestAnimationFrame(() => {
      chatInputRef.current?.focus()
    })
  }, [isInputDisabled, isStreaming])

  useEffect(() => {
    persistChatSettings(chatId, chatStyle, answerLength, enableThinking)
  }, [answerLength, chatId, chatStyle, enableThinking])

  useEffect(() => {
    if (errorText) {
      // 请求层已经提示过的错误会按最终文案去重，不会在全局 toast 之上再叠一层。
      showAppToast({ message: errorText })
    }
  }, [errorText])

  const handleSaveAsNote = useCallback(
    async (messageId: string) => {
      if (!chatId || !onSaveMessageAsNote || !messageId || messageId.startsWith('local-')) {
        return
      }
      setSavingAsNoteMessageId(messageId)
      try {
        await onSaveMessageAsNote({ chatId, msgId: messageId })
      } catch (error) {
        showAppToast({
          message: apiErrorMessage(error, 'chat:error.saveNote'),
        })
      } finally {
        setSavingAsNoteMessageId(null)
      }
    },
    [chatId, onSaveMessageAsNote],
  )

  const notebookInfoHeader = useMemo(
    () => (
      <ChatNotebookInfoHeader
        notebookId={notebookId}
        notebookName={notebookName}
        notebookDescription={notebookDescription}
        notebookSourceCount={notebookSourceCount}
        notebookCreatedAt={notebookCreatedAt}
        notebookCoverUrl={notebookCoverUrl}
        notebookOwner={notebookOwner}
        customizeDescription={customizeDescription}
        descriptionLoading={notebookDescriptionLoading}
      />
    ),
    [
      customizeDescription,
      notebookCoverUrl,
      notebookCreatedAt,
      notebookDescription,
      notebookDescriptionLoading,
      notebookId,
      notebookName,
      notebookOwner,
      notebookSourceCount,
    ],
  )

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 0,
        pt: chatPanelLayoutTokens.verticalPadding,
        pb: chatPanelLayoutTokens.bottomPadding,
        height: '100%',
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        // 双侧 panel 收展时隔离重排，减轻中间栏跟手卡顿
        contain: 'layout paint',
      }}
    >
      <Box sx={chatContentColumnSx}>
        <Box sx={chatReadableColumnSx}>
          <ChatPanelHeader
            sourcesPanelCollapsed={sourcesPanelCollapsed}
            insightsPanelCollapsed={insightsPanelCollapsed}
            onExpandSourcesPanel={onExpandSourcesPanel}
            onExpandInsightsPanel={onExpandInsightsPanel}
          />
        </Box>
      </Box>

      <ChatMessagesList
        messageListRef={messageListRef}
        selectedSourceIds={selectedSourceIds}
        notebookInfoHeader={notebookInfoHeader}
        messages={displayMessages}
        isLoadingHistory={isLoadingHistory}
        isFetchingMore={isFetchingMore}
        isStreaming={isStreaming}
        activeAssistantMessageId={activeAssistantMessageId}
        copiedUserMessageId={copiedUserMessageId}
        savingAsNoteMessageId={savingAsNoteMessageId}
        onScrollTopCheck={onMessageListScroll}
        onCopyUserMessage={onCopyUserMessage}
        onSaveAsNote={onSaveMessageAsNote ? handleSaveAsNote : undefined}
        onOpenCitationJump={onOpenCitationJump}
      />

      <Box sx={{ position: 'relative', ...chatContentColumnSx }}>
        {showScrollToBottomButton ? (
          <IconButton
            size="small"
            aria-label={t('chat:panel.scrollBottomAria')}
            onClick={smoothScrollToBottom}
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: `calc(100% + ${scrollToBottomButtonTokens.marginBottom * 8}px)`,
              width: scrollToBottomButtonTokens.size,
              height: scrollToBottomButtonTokens.size,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: (theme) => resolveWorkspaceElevation(theme).panel,
              zIndex: scrollToBottomButtonTokens.zIndex,
              '&:hover': {
                bgcolor: 'background.default',
              },
            }}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        ) : null}

        <Box sx={chatReadableColumnSx}>
          <ChatComposer
            inputRef={chatInputRef}
            interactionState={composerInteractionState}
            canSubmit={canSubmit}
            restoreNonce={composerRestoreNonce}
            restoreValue={composerRestoreValue}
            onSend={onSendMessage}
            onAbort={onAbortStream}
            suggestions={suggestions}
            suggestionsDisabled={isStreaming}
            onSuggestionSelect={sendPrompt}
          />
        </Box>
      </Box>

      <ChatSettingsDialog
        open={settingsDialogOpen}
        chatStyle={chatStyle}
        answerLength={answerLength}
        enableThinking={enableThinking}
        thinkingToggleDisabled={isThinkingToggleDisabled}
        onClose={handleCloseSettingsDialog}
        onSave={handleSaveSettings}
        onChatStyleChange={setChatStyle}
        onAnswerLengthChange={setAnswerLength}
        onEnableThinkingChange={setEnableThinking}
      />

    </Paper>
  )
}
