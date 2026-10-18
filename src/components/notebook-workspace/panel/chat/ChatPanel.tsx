import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Box, IconButton, Paper, Snackbar, Typography } from '@mui/material'
import { ChatComposer } from './ChatComposer'
import { ChatMessagesList } from './ChatMessagesList'
import { ChatNotebookInfoHeader } from './ChatNotebookInfoHeader'
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
import { workspaceRadius, workspaceSpace } from '../../shared/ui/layoutTokens'
import { resolveWorkspaceElevation } from '../../shared/ui/workspaceElevation'
import { chatPanelLayoutTokens } from './layoutTokens'
import { workspaceType } from '../../shared/ui/typeTokens'

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
  chatId,
  notebookName,
  notebookDescription,
  notebookSourceCount,
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
  const [errorToast, setErrorToast] = useState<{ key: number; message: string } | null>(null)
  const errorToastKeyRef = useRef(0)
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
    if (!errorText) {
      return
    }
    errorToastKeyRef.current += 1
    // oxlint-disable-next-line react-doctor/no-derived-state -- Toast visibility is intentionally decoupled from source error text for manual dismissal.
    setErrorToast({
      key: errorToastKeyRef.current,
      message: errorText,
    })
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
        errorToastKeyRef.current += 1
        setErrorToast({
          key: errorToastKeyRef.current,
          message: error instanceof Error && error.message.trim()
            ? error.message
            : t('chat:error.saveNote'),
        })
      } finally {
        setSavingAsNoteMessageId(null)
      }
    },
    [chatId, onSaveMessageAsNote, t],
  )

  const notebookInfoHeader = useMemo(
    () => (
      <ChatNotebookInfoHeader
        notebookName={notebookName}
        notebookDescription={notebookDescription}
        notebookSourceCount={notebookSourceCount}
        descriptionLoading={notebookDescriptionLoading}
      />
    ),
    [notebookDescription, notebookDescriptionLoading, notebookName, notebookSourceCount],
  )

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 0,
        py: chatPanelLayoutTokens.verticalPadding,
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
      <Box sx={{ px: chatPanelLayoutTokens.horizontalPadding }}>
        <ChatPanelHeader
          sourcesPanelCollapsed={sourcesPanelCollapsed}
          insightsPanelCollapsed={insightsPanelCollapsed}
          onExpandSourcesPanel={onExpandSourcesPanel}
          onExpandInsightsPanel={onExpandInsightsPanel}
        />
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

      <Box sx={{ position: 'relative', px: chatPanelLayoutTokens.horizontalPadding }}>
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

      <Snackbar
        key={errorToast?.key}
        open={Boolean(errorToast)}
        autoHideDuration={2400}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return
          }
          setErrorToast(null)
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
              color: 'primary.contrastText',
            }}
          >
            {errorToast?.message ?? ''}
          </Typography>
        </Paper>
      </Snackbar>
    </Paper>
  )
}
