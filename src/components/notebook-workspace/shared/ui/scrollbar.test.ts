import type { Theme } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'
import { subtleScrollbarSx } from './scrollbar'
import { workspaceColorPalette } from './workspaceColorPalette'

describe('subtleScrollbarSx', () => {
  const theme = {
    workspacePalette: workspaceColorPalette,
  } as Theme

  it('styles the host element by default', () => {
    const sx = subtleScrollbarSx(theme)
    expect(sx.scrollbarWidth).toBe('thin')
    expect(sx['&::-webkit-scrollbar']).toEqual({ width: 5, height: 5 })
  })

  it('can target a nested scrollable like textarea', () => {
    const sx = subtleScrollbarSx(theme, { within: '& textarea' })
    expect(sx['& textarea']).toMatchObject({
      scrollbarWidth: 'thin',
      scrollbarColor: 'transparent transparent',
    })
    expect(sx['& textarea::-webkit-scrollbar']).toEqual({ width: 5, height: 5 })
  })
})
