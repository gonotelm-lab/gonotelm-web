import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./useChatConversation', () => ({
  useChatConversation: () => ({
    composerValue: '',
    enableThinking: false,
    displayMessages: [],
    streamStatus: '',
    streamPhaseType: null,
    showStreamStatus: false,
    showStreamFlowAnimation: false,
    isLoadingHistory: false,
    isFetchingMore: false,
    isStreaming: false,
    activeAssistantMessageId: null,
    copiedUserMessageId: null,
    errorText: '',
    finishReasonNotice: '',
    isClearingContext: false,
    showScrollToBottomButton: false,
    submitDisabled: false,
    isInputDisabled: false,
    isAbortDisabled: true,
    isThinkingToggleDisabled: false,
    messageListRef: { current: null },
    setComposerValue: () => undefined,
    setEnableThinking: () => undefined,
    onMessageListScroll: () => undefined,
    onCopyUserMessage: () => undefined,
    onComposerKeyDown: () => undefined,
    onSendMessage: () => undefined,
    onAbortStream: () => undefined,
    onClearCurrentContext: () => undefined,
    smoothScrollToBottom: () => undefined,
  }),
}))

vi.mock('./ChatComposer', () => ({
  ChatComposer: () => <div data-testid="chat-composer" />,
}))

vi.mock('./ChatMessagesList', () => ({
  ChatMessagesList: ({ notebookInfoHeader }: { notebookInfoHeader?: ReactNode }) => (
    <div data-testid="chat-messages-list">
      {notebookInfoHeader}
      <div data-testid="chat-messages-list-content" />
    </div>
  ),
}))

vi.mock('./ChatNotebookInfoHeader', () => ({
  ChatNotebookInfoHeader: ({
    notebookName,
    notebookDescription,
    notebookSourceCount,
  }: {
    notebookName: string
    notebookDescription: string
    notebookSourceCount: number
  }) => (
    <div data-testid="chat-notebook-info-header-mock">
      {`${notebookName}|${notebookDescription}|${String(notebookSourceCount)}`}
    </div>
  ),
}))

vi.mock('./ChatPanelHeader', () => ({
  ChatPanelHeader: () => <div data-testid="chat-panel-header" />,
}))

vi.mock('./ChatSettingsDialog', () => ({
  ChatSettingsDialog: () => null,
}))

import { ChatPanel } from './ChatPanel'

describe('ChatPanel layout', () => {
  it('renders notebook info header inside messages scroll container and forwards notebook metadata', () => {
    const html = renderToStaticMarkup(
      <ChatPanel
        notebookId="notebook-1"
        chatId="chat-1"
        notebookName="DMA Notebook"
        notebookDescription="Interoperability proposal"
        notebookSourceCount={9}
        selectedSourceIds={[]}
        sourcesPanelCollapsed={false}
        insightsPanelCollapsed={false}
        onExpandSourcesPanel={() => undefined}
        onExpandInsightsPanel={() => undefined}
        onOpenCitationJump={() => undefined}
      />,
    )

    const infoHeaderIndex = html.indexOf('chat-notebook-info-header-mock')
    const messagesListIndex = html.indexOf('chat-messages-list')

    expect(messagesListIndex).toBeGreaterThan(-1)
    expect(infoHeaderIndex).toBeGreaterThan(messagesListIndex)
    expect(html).toContain('DMA Notebook|Interoperability proposal|9')
  })
})
