import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ChatInputBox, type ChatInputInteractionState } from './ChatInputBox'

const idleInteractionState: ChatInputInteractionState = {
  isStreaming: false,
  isInputDisabled: false,
  isSubmitDisabled: true,
  isAbortDisabled: true,
}

describe('ChatInputBox', () => {
  it('renders suggestion buttons in the same row as the send button', () => {
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <ChatInputBox
          value=""
          interactionState={idleInteractionState}
          onValueChange={() => undefined}
          onKeyDown={() => undefined}
          onSend={() => undefined}
          onAbort={() => undefined}
          suggestions={['建议一', '建议二', '建议三']}
          onSuggestionSelect={() => undefined}
        />,
      )
    })

    const controlsRow = renderer!.root.findByProps({ 'data-testid': 'chat-input-controls-row' })
    const buttonsInRow = controlsRow.findAll((node) => node.type === 'button')
    expect(buttonsInRow).toHaveLength(4)
  })

  it('renders only the send button when there are no suggestions', () => {
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <ChatInputBox
          value=""
          interactionState={idleInteractionState}
          onValueChange={() => undefined}
          onKeyDown={() => undefined}
          onSend={() => undefined}
          onAbort={() => undefined}
        />,
      )
    })

    const controlsRow = renderer!.root.findByProps({ 'data-testid': 'chat-input-controls-row' })
    const buttonsInRow = controlsRow.findAll((node) => node.type === 'button')
    expect(buttonsInRow).toHaveLength(1)
  })

  it('notifies onSuggestionSelect with the question when a suggestion is clicked', () => {
    const onSuggestionSelect = vi.fn()
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <ChatInputBox
          value=""
          interactionState={idleInteractionState}
          onValueChange={() => undefined}
          onKeyDown={() => undefined}
          onSend={() => undefined}
          onAbort={() => undefined}
          suggestions={['点击我']}
          onSuggestionSelect={onSuggestionSelect}
        />,
      )
    })

    const suggestionButton = renderer!.root.findAll(
      (node) => typeof node.props['data-suggestion'] === 'string',
    )[0]
    act(() => {
      suggestionButton.props.onClick()
    })

    expect(onSuggestionSelect).toHaveBeenCalledWith('点击我')
  })
})
