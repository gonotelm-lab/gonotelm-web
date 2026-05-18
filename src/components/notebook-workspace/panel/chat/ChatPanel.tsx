import { useEffect, useRef, useState } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Box, IconButton, Paper, Snackbar, Typography } from '@mui/material'
import {
  ChatComposer,
  ChatMessagesList,
  ChatNotebookInfoHeader,
  ChatPanelHeader,
  ChatSettingsDialog,
} from './components'
import {
  chatAnswerLengthOptionList,
  chatStyleOptionList,
  type ChatAnswerLengthOption,
  type ChatStyleOption,
} from './constants'
import { useChatConversation } from './hooks'
import { chatPanelLayoutTokens } from './layoutTokens'

const scrollToBottomButtonTokens = {
  size: 32,
  marginBottom: 1.15,
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
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
}

const buildChatSettingsStorageKey = (chatId: string) =>
  `${chatSettingsStorageKeyPrefix}:${chatId}`

const resolveStoredChatSettings = (
  chatId: string,
): {
  chatStyle: ChatStyleOption
  answerLength: ChatAnswerLengthOption
} => {
  if (typeof window === 'undefined' || !chatId) {
    return {
      chatStyle: defaultChatStyle,
      answerLength: defaultChatAnswerLength,
    }
  }
  const persistedSettings = window.localStorage.getItem(buildChatSettingsStorageKey(chatId))
  if (!persistedSettings) {
    return {
      chatStyle: defaultChatStyle,
      answerLength: defaultChatAnswerLength,
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
    return {
      chatStyle,
      answerLength,
    }
  } catch {
    return {
      chatStyle: defaultChatStyle,
      answerLength: defaultChatAnswerLength,
    }
  }
}

const persistChatSettings = (
  chatId: string,
  chatStyle: ChatStyleOption,
  answerLength: ChatAnswerLengthOption,
) => {
  if (typeof window === 'undefined' || !chatId) {
    return
  }
  window.localStorage.setItem(
    buildChatSettingsStorageKey(chatId),
    JSON.stringify({
      style: chatStyle,
      answerLength,
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
}

export function ChatPanel({
  notebookId,
  ...restProps
}: ChatPanelProps) {
  return <ChatPanelContent key={`${notebookId}:${restProps.chatId}`} {...restProps} />
}

type ChatPanelContentProps = Omit<ChatPanelProps, 'notebookId'>

function ChatPanelContent({
  chatId,
  notebookName,
  notebookDescription,
  notebookSourceCount,
  selectedSourceIds,
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
}: ChatPanelContentProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [chatStyle, setChatStyle] = useState<ChatStyleOption>(
    () => resolveStoredChatSettings(chatId).chatStyle,
  )
  const [answerLength, setAnswerLength] = useState<ChatAnswerLengthOption>(
    () => resolveStoredChatSettings(chatId).answerLength,
  )
  const [errorToast, setErrorToast] = useState<{ key: number; message: string } | null>(null)
  const errorToastKeyRef = useRef(0)
  const chatInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const wasStreamingRef = useRef(false)

  const {
    composerValue,
    enableThinking,
    displayMessages,
    streamStatus,
    streamPhaseType,
    showStreamStatus,
    showStreamFlowAnimation,
    isLoadingHistory,
    isFetchingMore,
    isStreaming,
    activeAssistantMessageId,
    copiedUserMessageId,
    errorText,
    finishReasonNotice,
    isClearingContext,
    showScrollToBottomButton,
    submitDisabled,
    isInputDisabled,
    isAbortDisabled,
    isThinkingToggleDisabled,
    messageListRef,
    setComposerValue,
    setEnableThinking,
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
    persistChatSettings(chatId, chatStyle, answerLength)
  }, [answerLength, chatId, chatStyle])

  useEffect(() => {
    if (!errorText) {
      return
    }
    errorToastKeyRef.current += 1
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
        enableThinking={enableThinking}
        notebookInfoHeader={(
          <ChatNotebookInfoHeader
            notebookName={notebookName}
            notebookDescription={notebookDescription}
            notebookSourceCount={notebookSourceCount}
          />
        )}
        messages={displayMessages}
        streamStatus={showStreamStatus ? streamStatus : ''}
        streamPhaseType={showStreamStatus ? streamPhaseType : null}
        showStreamFlowAnimation={showStreamFlowAnimation}
        isLoadingHistory={isLoadingHistory}
        isFetchingMore={isFetchingMore}
        isStreaming={isStreaming}
        activeAssistantMessageId={activeAssistantMessageId}
        copiedUserMessageId={copiedUserMessageId}
        onScrollTopCheck={onMessageListScroll}
        onCopyUserMessage={onCopyUserMessage}
      />

      {finishReasonNotice ? (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ mt: 1, px: chatPanelLayoutTokens.horizontalPadding }}
        >
          {finishReasonNotice}
        </Typography>
      ) : null}

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
              boxShadow: scrollToBottomButtonTokens.boxShadow,
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
          isStreaming={isStreaming}
          isInputDisabled={isInputDisabled}
          isSubmitDisabled={submitDisabled}
          isAbortDisabled={isAbortDisabled}
          enableThinking={enableThinking}
          isThinkingToggleDisabled={isThinkingToggleDisabled}
          onValueChange={setComposerValue}
          onThinkingToggle={setEnableThinking}
          onKeyDown={onComposerKeyDown}
          onSend={onSendMessage}
          onAbort={onAbortStream}
        />
      </Box>

      <ChatSettingsDialog
        open={settingsDialogOpen}
        chatStyle={chatStyle}
        answerLength={answerLength}
        onClose={handleCloseSettingsDialog}
        onSave={handleSaveSettings}
        onChatStyleChange={setChatStyle}
        onAnswerLengthChange={setAnswerLength}
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
            px: 1.5,
            py: 0.6,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: '#334155',
            bgcolor: '#1E293B',
            maxWidth: 420,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontSize: 12.2,
              lineHeight: 1.35,
              color: '#F8FAFC',
            }}
          >
            {errorToast?.message ?? ''}
          </Typography>
        </Paper>
      </Snackbar>
    </Paper>
  )
}
