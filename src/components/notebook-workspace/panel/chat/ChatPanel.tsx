import { useEffect, useRef, useState } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Box, IconButton, Paper, Snackbar, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ChatComposer } from './ChatComposer'
import { ChatMessagesList } from './ChatMessagesList'
import { ChatNotebookInfoHeader } from './ChatNotebookInfoHeader'
import { ChatPanelHeader } from './ChatPanelHeader'
import { ChatSettingsDialog } from './ChatSettingsDialog'
import {
  chatAnswerLengthOptionList,
  chatStyleOptionList,
  type ChatAnswerLengthOption,
  type ChatStyleOption,
} from './chatSettings'
import type { ChatCitationJumpRequest } from './types'
import { useChatConversation } from './useChatConversation'
import { workspaceRadius, workspaceSpace } from '../../shared/ui/layoutTokens'
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
const chatStyleOptionSet = new Set<ChatStyleOption>(
  chatStyleOptionList.map(({ value }) => value),
)
const chatAnswerLengthOptionSet = new Set<ChatAnswerLengthOption>(
  chatAnswerLengthOptionList.map(({ value }) => value),
)

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

interface ChatPanelProps {
  notebookId: string
  chatId: string
  notebookName: string
  notebookDescription: string
  notebookSourceCount: number
  selectedSourceIds: string[]
  sourcesPanelCollapsed: boolean
  insightsPanelCollapsed: boolean
  onExpandSourcesPanel: () => void
  onExpandInsightsPanel: () => void
  onOpenCitationJump: (request: ChatCitationJumpRequest) => void
}

export function ChatPanel({
  notebookId,
  ...restProps
}: ChatPanelProps) {
  return <ChatPanelContent notebookId={notebookId} key={`${notebookId}:${restProps.chatId}`} {...restProps} />
}

type ChatPanelContentProps = Omit<ChatPanelProps, never>

function ChatPanelContent({
  notebookId,
  chatId,
  notebookName,
  notebookDescription,
  notebookSourceCount,
  selectedSourceIds,
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
  onOpenCitationJump,
}: ChatPanelContentProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
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

  const {
    composerValue,
    displayMessages,
    isLoadingHistory,
    isFetchingMore,
    isStreaming,
    activeAssistantMessageId,
    copiedUserMessageId,
    errorText,
    isClearingContext,
    showScrollToBottomButton,
    submitDisabled,
    isInputDisabled,
    isAbortDisabled,
    isThinkingToggleDisabled,
    messageListRef,
    setComposerValue,
    onMessageListScroll,
    onCopyUserMessage,
    onComposerKeyDown,
    onSendMessage,
    onAbortStream,
    onClearCurrentContext,
    smoothScrollToBottom,
  } = useChatConversation({
    chatId,
    selectedSourceIds,
    chatStyle,
    answerLength,
    enableThinking,
  })

  const handleOpenSettingsDialog = () => {
    setSettingsDialogOpen(true)
  }

  const handleCloseSettingsDialog = () => {
    setSettingsDialogOpen(false)
  }

  const handleSaveSettings = () => {
    setSettingsDialogOpen(false)
  }

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
          hasChatId={Boolean(chatId)}
          isClearingContext={isClearingContext}
          isStreaming={isStreaming}
          onExpandSourcesPanel={onExpandSourcesPanel}
          onExpandInsightsPanel={onExpandInsightsPanel}
          onClearCurrentContext={onClearCurrentContext}
          onOpenSettingsDialog={handleOpenSettingsDialog}
          rightContentPadding={0}
        />
      </Box>

      <ChatMessagesList
        messageListRef={messageListRef}
        selectedSourceIds={selectedSourceIds}
        notebookInfoHeader={(
          <ChatNotebookInfoHeader
            notebookName={notebookName}
            notebookDescription={notebookDescription}
            notebookSourceCount={notebookSourceCount}
          />
        )}
        messages={displayMessages}
        isLoadingHistory={isLoadingHistory}
        isFetchingMore={isFetchingMore}
        isStreaming={isStreaming}
        activeAssistantMessageId={activeAssistantMessageId}
        copiedUserMessageId={copiedUserMessageId}
        onScrollTopCheck={onMessageListScroll}
        onCopyUserMessage={onCopyUserMessage}
        onOpenCitationJump={onOpenCitationJump}
      />

      <Box sx={{ position: 'relative', px: chatPanelLayoutTokens.horizontalPadding }}>
        {showScrollToBottomButton ? (
          <IconButton
            size="small"
            aria-label="回到底部"
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
              boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.dark, 0.16)}`,
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
          value={composerValue}
          inputRef={chatInputRef}
          interactionState={{
            isStreaming,
            isInputDisabled,
            isSubmitDisabled: submitDisabled,
            isAbortDisabled,
          }}
          onValueChange={setComposerValue}
          onKeyDown={onComposerKeyDown}
          onSend={onSendMessage}
          onAbort={onAbortStream}
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
              color: 'background.default',
            }}
          >
            {errorToast?.message ?? ''}
          </Typography>
        </Paper>
      </Snackbar>
    </Paper>
  )
}
