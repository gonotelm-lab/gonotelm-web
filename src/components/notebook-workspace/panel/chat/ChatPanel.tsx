import { useEffect, useRef, useState } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import {
  ChatComposer,
  ChatMessagesList,
  ChatNotebookInfoHeader,
  ChatPanelHeader,
  ChatSettingsDialog,
} from './components'
import { type ChatAnswerLengthOption, type ChatStyleOption } from './constants'
import { useChatConversation } from './hooks'
import { chatPanelLayoutTokens } from './layoutTokens'

const scrollToBottomButtonTokens = {
  size: 32,
  marginBottom: 1.15,
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
  zIndex: 2,
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
  return <ChatPanelContent key={notebookId} {...restProps} />
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
  const [chatStyle, setChatStyle] = useState<ChatStyleOption>('default')
  const [answerLength, setAnswerLength] = useState<ChatAnswerLengthOption>('default')
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

      {errorText ? (
        <Typography
          variant="caption"
          color="error.main"
          sx={{ mt: 1, px: chatPanelLayoutTokens.horizontalPadding }}
        >
          {errorText}
        </Typography>
      ) : finishReasonNotice ? (
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
    </Paper>
  )
}
