import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useSettingsDialogRoute } from './useSettingsDialogRoute'

type MemoryRouter = ReturnType<typeof createMemoryRouter>

/** 把 URL 打出来，用来断言「对话框状态 = URL」。 */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

/** 动作按钮等价于真实调用点（账号菜单打开、导航栏切换、关闭）。 */
function Harness() {
  const { isOpen, activeSection, openSettings, closeSettings, selectSection } =
    useSettingsDialogRoute()

  return (
    <div>
      <div data-testid="is-open">{String(isOpen)}</div>
      <div data-testid="active-section">{activeSection}</div>
      <button data-testid="open" onClick={() => openSettings()}>
        open
      </button>
      <button data-testid="open-account" onClick={() => openSettings('account')}>
        open security
      </button>
      <button data-testid="select-general" onClick={() => selectSection('general')}>
        general
      </button>
      <button data-testid="close" onClick={closeSettings}>
        close
      </button>
      <LocationProbe />
    </div>
  )
}

const renderHarness = async (entry: string) => {
  const router = createMemoryRouter([{ path: '*', element: <Harness /> }], {
    initialEntries: [entry],
  })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(<RouterProvider router={router} />)
  })
  return { renderer, router }
}

const url = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'location' }).children.join('')
const isOpen = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'is-open' }).children.join('')
const section = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'active-section' }).children.join('')

const click = (renderer: ReactTestRenderer, testId: string) =>
  act(() => {
    renderer.root.findByProps({ 'data-testid': testId }).props.onClick()
  })

const goBack = async (router: MemoryRouter) => {
  await act(async () => {
    await router.navigate(-1)
  })
}

describe('useSettingsDialogRoute', () => {
  it('默认关闭，URL 里没有 settings 参数', async () => {
    const { renderer } = await renderHarness('/notebook/n-1')

    expect(isOpen(renderer)).toBe('false')
    expect(url(renderer)).toBe('/notebook/n-1')
  })

  it('打开时把分区写进 URL（默认 profile）', async () => {
    const { renderer } = await renderHarness('/notebook/n-1')
    click(renderer, 'open')

    expect(isOpen(renderer)).toBe('true')
    expect(section(renderer)).toBe('profile')
    expect(url(renderer)).toBe('/notebook/n-1?settings=profile')
  })

  it('深链直接进某个分区：?settings=account 打开即账号安全', async () => {
    const { renderer } = await renderHarness('/notebook/n-1?settings=account')

    expect(isOpen(renderer)).toBe('true')
    expect(section(renderer)).toBe('account')
  })

  it('未知分区值退回默认分区，而不是判成关闭', async () => {
    const { renderer } = await renderHarness('/notebook/n-1?settings=nonsense')

    expect(isOpen(renderer)).toBe('true')
    expect(section(renderer)).toBe('profile')
  })

  it('关闭只去掉参数，保留其它 query', async () => {
    const { renderer } = await renderHarness('/notebook/n-1?tab=chat&settings=account')
    click(renderer, 'close')

    expect(isOpen(renderer)).toBe('false')
    expect(url(renderer)).toBe('/notebook/n-1?tab=chat')
  })

  it('打开是 push：浏览器后退键正好等于关闭对话框', async () => {
    const { renderer, router } = await renderHarness('/notebook/n-1')
    click(renderer, 'open')
    expect(isOpen(renderer)).toBe('true')

    await goBack(router)

    expect(isOpen(renderer)).toBe('false')
    expect(url(renderer)).toBe('/notebook/n-1')
  })

  it('切换分区是 replace：后退是关闭，而不是退回上一个分区', async () => {
    const { renderer, router } = await renderHarness('/notebook/n-1')
    click(renderer, 'open')
    click(renderer, 'select-general')
    expect(url(renderer)).toBe('/notebook/n-1?settings=general')

    await goBack(router)

    expect(isOpen(renderer)).toBe('false')
  })

  it('已打开时再次 open 只切分区，不重复压历史', async () => {
    const { renderer, router } = await renderHarness('/notebook/n-1')
    click(renderer, 'open')
    // 第二次 open（带分区）应 replace，而不是再 push 一条
    click(renderer, 'open-account')
    expect(url(renderer)).toBe('/notebook/n-1?settings=account')

    // 若第二次 open 压了历史，这次后退会退回 ?settings=profile（对话框仍开着）。
    await goBack(router)

    expect(isOpen(renderer)).toBe('false')
    expect(url(renderer)).toBe('/notebook/n-1')
  })
})
