import { useState } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import {
  ChatComposer,
  ChatMessagesList,
  ChatPanelHeader,
  ChatSettingsDialog,
} from './chat-panel/components'
import { type ChatAnswerLengthOption, type ChatStyleOption } from './chat-panel/constants'
import { useChatConversation } from './chat-panel/hooks'

const chatPanelLeftPadding = 3
const chatPanelRightContentPadding = 2.75
const chatPanelRightContentPaddingPx = chatPanelRightContentPadding * 8
const chatPanelVerticalPadding = 2
const scrollToBottomButtonTokens = {
  size: 32,
  rightPx: 7.8,
  marginBottom: 1.15,
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
  zIndex: 2,
}

interface ChatPanelProps {
  notebookId: string
  chatId: string
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
  selectedSourceIds,
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
}: ChatPanelContentProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [chatStyle, setChatStyle] = useState<ChatStyleOption>('default')
  const [answerLength, setAnswerLength] = useState<ChatAnswerLengthOption>('default')

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

  return (
    <Paper
      variant="outlined"
      sx={{
        pl: chatPanelLeftPadding,
        pr: 0,
        py: chatPanelVerticalPadding,
        height: '100%',
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
        rightContentPadding={chatPanelRightContentPadding}
      />

      <ChatMessagesList
        messageListRef={messageListRef}
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
          sx={{ mt: 1, pr: chatPanelRightContentPadding }}
        >
          {errorText}
        </Typography>
      ) : finishReasonNotice ? (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ mt: 1, pr: chatPanelRightContentPadding }}
        >
          {finishReasonNotice}
        </Typography>
      ) : null}

      <Box sx={{ position: 'relative', pr: chatPanelRightContentPadding }}>
        {showScrollToBottomButton ? (
          <IconButton
            size="small"
            aria-label="回到底部"
            onClick={smoothScrollToBottom}
            sx={{
              position: 'absolute',
              right: `${scrollToBottomButtonTokens.rightPx + chatPanelRightContentPaddingPx}px`,
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
