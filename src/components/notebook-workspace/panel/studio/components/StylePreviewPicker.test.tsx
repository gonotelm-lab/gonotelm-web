import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { describe, expect, it, vi } from 'vitest'
import { StylePreviewPicker, type StylePreviewOption } from './StylePreviewPicker'

const optionsWithPreviews: StylePreviewOption[] = [
  { value: 'default', label: '默认', previewUrl: 'https://cdn.example.com/default.webp' },
  { value: 'cute', label: '可爱', previewUrl: 'https://cdn.example.com/cute.webp' },
  { value: 'educational', label: '教学科普', previewUrl: '' },
]

const optionsWithoutPreviews: StylePreviewOption[] = [
  { value: 'default', label: '默认' },
  { value: 'educational', label: '教学科普' },
  { value: 'cute', label: '可爱' },
]

const render = async (options: StylePreviewOption[], value = 'default') => {
  const onChange = vi.fn()
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <StylePreviewPicker
        value={value}
        options={options}
        onChange={onChange}
        ariaLabel="视觉风格"
      />,
      { createNodeMock: () => ({}) },
    )
  })
  return { renderer, onChange }
}

describe('StylePreviewPicker', () => {
  it('renders horizontal, scrollable preview cards when the backend returned images', async () => {
    const { renderer } = await render(optionsWithPreviews)

    const group = renderer.root.findByType(ToggleButtonGroup)
    expect(group.props.sx).toMatchObject({ overflowX: 'auto' })
    expect(renderer.root.findAllByType(ToggleButton)).toHaveLength(3)

    const images = renderer.root.findAllByType('img')
    expect(images.map((image) => image.props.src)).toEqual([
      'https://cdn.example.com/default.webp',
      'https://cdn.example.com/cute.webp',
    ])
  })

  it('falls back to plain pills when no option has a preview image', async () => {
    const { renderer } = await render(optionsWithoutPreviews)

    expect(renderer.root.findAllByType('img')).toHaveLength(0)
    expect(
      renderer.root.findAllByType(ToggleButton).map((button) => button.props.children),
    ).toEqual(['默认', '教学科普', '可爱'])
  })

  it('emits the picked value', async () => {
    const { renderer, onChange } = await render(optionsWithPreviews)

    const cute = renderer.root
      .findAllByType('button')
      .find((button) => button.props.value === 'cute')
    await act(async () => {
      cute?.props.onClick({ defaultPrevented: false })
    })

    expect(onChange).toHaveBeenCalledWith('cute')
  })
})
