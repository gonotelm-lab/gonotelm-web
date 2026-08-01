import { renderToStaticMarkup } from 'react-dom/server'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ChatSuggestions } from './ChatSuggestions'

describe('ChatSuggestions', () => {
  it('renders at most 3 suggestions and hides the rest', () => {
    const html = renderToStaticMarkup(
      <ChatSuggestions
        suggestions={['建议一', '建议二', '建议三', '建议四']}
        onSelect={() => undefined}
      />,
    )

    expect(html).toContain('建议一')
    expect(html).toContain('建议三')
    expect(html).not.toContain('建议四')
  })

  it('renders nothing when suggestions are empty', () => {
    const html = renderToStaticMarkup(<ChatSuggestions suggestions={[]} />)

    expect(html).toBe('')
  })

  it('notifies onSelect with the question when a suggestion is clicked', () => {
    const onSelect = vi.fn()
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(<ChatSuggestions suggestions={['点击我']} onSelect={onSelect} />)
    })

    const button = renderer!.root.findAll(
      (node) => typeof node.props['data-suggestion'] === 'string',
    )[0]
    act(() => {
      button.props.onClick()
    })

    expect(onSelect).toHaveBeenCalledWith('点击我')
  })

  it('disables suggestion buttons while streaming', () => {
    let renderer!: ReactTestRenderer
    act(() => {
      renderer = create(
        <ChatSuggestions suggestions={['建议一']} disabled onSelect={() => undefined} />,
      )
    })

    const button = renderer!.root.findAll(
      (node) => typeof node.props['data-suggestion'] === 'string',
    )[0]
    expect(button.props.disabled).toBe(true)
  })
})
