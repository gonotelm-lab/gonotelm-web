import { useEffect } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { PanelSubpageLayout } from './PanelSubpageLayout'

describe('PanelSubpageLayout', () => {
  it('keeps primary content mounted when opening and closing a subpage', () => {
    const mountCount = vi.fn()

    function PrimaryProbe() {
      useEffect(() => {
        mountCount()
      }, [])
      return <div data-testid="primary-probe" />
    }

    let renderer: ReturnType<typeof create>
    act(() => {
      renderer = create(
        <PanelSubpageLayout primaryContent={<PrimaryProbe />} subpage={null} />,
      )
    })
    expect(mountCount).toHaveBeenCalledTimes(1)

    act(() => {
      renderer!.update(
        <PanelSubpageLayout
          primaryContent={<PrimaryProbe />}
          subpage={{
            parentTitle: '工作区',
            title: '预览',
            content: <div>preview</div>,
            onClose: () => undefined,
          }}
        />,
      )
    })
    expect(mountCount).toHaveBeenCalledTimes(1)

    act(() => {
      renderer!.update(
        <PanelSubpageLayout primaryContent={<PrimaryProbe />} subpage={null} />,
      )
    })
    expect(mountCount).toHaveBeenCalledTimes(1)
  })
})
