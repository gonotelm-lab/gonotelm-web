import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { getChatSuggestions } from '@/api/chat'
import { ApiError } from '@/lib/http'
import { useChatSuggestions } from './useChatSuggestions'

vi.mock('@/api/chat', () => ({
  getChatSuggestions: vi.fn(),
}))

const mockGetChatSuggestions = vi.mocked(getChatSuggestions)

function SuggestionsHarness({
  chatId,
  readySourceIds,
  selectedSourceIds,
}: {
  chatId: string
  readySourceIds: string[]
  selectedSourceIds: string[]
}) {
  const { suggestions, fetchFollowup } = useChatSuggestions({
    chatId,
    readySourceIds,
    selectedSourceIds,
  })
  return (
    <div>
      <span data-testid="suggestions">{suggestions.join('|')}</span>
      <button type="button" data-testid="followup" onClick={fetchFollowup} />
    </div>
  )
}

const readSuggestions = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'suggestions' }).props.children as string

describe('useChatSuggestions', () => {
  it('fetches opener once on the first empty-to-nonempty ready transition and caps at 3', async () => {
    mockGetChatSuggestions.mockResolvedValue({
      type: 'opener',
      questions: ['q1', 'q2', 'q3', 'q4'],
    })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })

    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
    expect(mockGetChatSuggestions).toHaveBeenCalledWith({ id: 'chat-1', source_ids: ['s1'] })
    expect(readSuggestions(renderer)).toBe('q1|q2|q3')

    await act(async () => {
      renderer.update(
        <SuggestionsHarness
          chatId="chat-1"
          readySourceIds={['s1', 's2']}
          selectedSourceIds={['s1', 's2']}
        />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
  })

  it('does not fetch opener when sources are already ready on mount', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'opener', questions: ['q1'] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    await act(async () => {})
    expect(mockGetChatSuggestions).not.toHaveBeenCalled()
    expect(readSuggestions(renderer)).toBe('')
  })

  it('defers opener until sources are selected, then fetches with selected ids only', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'opener', questions: ['q1'] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })

    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={[]} />,
      )
    })
    expect(mockGetChatSuggestions).not.toHaveBeenCalled()

    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
    expect(mockGetChatSuggestions).toHaveBeenCalledWith({ id: 'chat-1', source_ids: ['s1'] })

    await act(async () => {
      renderer.update(
        <SuggestionsHarness
          chatId="chat-1"
          readySourceIds={['s1', 's2']}
          selectedSourceIds={['s1', 's2']}
        />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
  })

  it('clears suggestions when the response questions is null', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'opener', questions: null as never })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })

    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
    expect(readSuggestions(renderer)).toBe('')
  })

  it('does not fetch when chatId is empty', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'opener', questions: ['q1'] })
    act(() => {
      create(<SuggestionsHarness chatId="" readySourceIds={['s1']} selectedSourceIds={['s1']} />)
    })
    await act(async () => {})
    expect(mockGetChatSuggestions).not.toHaveBeenCalled()
  })

  it('fetches followup suggestions via fetchFollowup with the latest selected sources', async () => {
    mockGetChatSuggestions.mockResolvedValue({ type: 'follow_up', questions: ['f1', 'f2'] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={['s1']} />,
      )
    })
    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'followup' }).props.onClick()
    })
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
    expect(mockGetChatSuggestions).toHaveBeenCalledWith({ id: 'chat-1', source_ids: ['s1'] })
    expect(readSuggestions(renderer)).toBe('f1|f2')
  })

  it('clears suggestions when a fetch resolves with empty questions', async () => {
    mockGetChatSuggestions
      .mockResolvedValueOnce({ type: 'opener', questions: ['q1'] })
      .mockResolvedValueOnce({ type: 'follow_up', questions: [] })
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })
    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(readSuggestions(renderer)).toBe('q1')

    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'followup' }).props.onClick()
    })
    expect(readSuggestions(renderer)).toBe('')
  })

  it('keeps existing suggestions when a fetch fails', async () => {
    mockGetChatSuggestions
      .mockResolvedValueOnce({ type: 'opener', questions: ['q1'] })
      .mockRejectedValueOnce(new Error('mock failure'))
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
      )
    })
    await act(async () => {
      renderer.update(
        <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
      )
    })
    expect(readSuggestions(renderer)).toBe('q1')

    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'followup' }).props.onClick()
    })
    expect(readSuggestions(renderer)).toBe('q1')
    expect(mockGetChatSuggestions).toHaveBeenCalledTimes(2)
  })

  it('retries with capped exponential backoff on lock-taken errors until success', async () => {
    vi.useFakeTimers()
    try {
      mockGetChatSuggestions
        .mockRejectedValueOnce(new ApiError('LOCK_TAKEN', 1005, 200))
        .mockRejectedValueOnce(new ApiError('suggestion is generating', 1005, 200))
        .mockResolvedValue({ type: 'opener', questions: ['q1'] })
      let renderer!: ReactTestRenderer
      act(() => {
        renderer = create(
          <SuggestionsHarness chatId="chat-1" readySourceIds={[]} selectedSourceIds={[]} />,
        )
      })
      await act(async () => {
        renderer.update(
          <SuggestionsHarness chatId="chat-1" readySourceIds={['s1']} selectedSourceIds={['s1']} />,
        )
      })
      expect(mockGetChatSuggestions).toHaveBeenCalledTimes(1)
      expect(readSuggestions(renderer)).toBe('')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(mockGetChatSuggestions).toHaveBeenCalledTimes(2)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      expect(mockGetChatSuggestions).toHaveBeenCalledTimes(3)
      expect(readSuggestions(renderer)).toBe('q1')
    } finally {
      vi.useRealTimers()
    }
  })
})
