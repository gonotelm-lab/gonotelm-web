import { StrictMode, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToggleButtonGroup } from '@mui/material'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    // Dialog 走 Portal，node 测试环境没有 document；用普通容器承接弹窗内容。
    Dialog: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="settings-dialog">{children}</div> : null,
    // Slider 的 useSlider 在 effect 里读取 ownerDocument，node 环境同样没有 document。
    // 测试不驱动缩放，因此用占位元素承接即可。
    Slider: () => <div data-testid="avatar-crop-zoom" />,
  }
})

import { SettingsDialog } from './SettingsDialog'

// MUI Avatar 在 effect 里 new Image() 预加载；node 测试环境没有该全局。
// 头像校验与裁剪也依赖 Image 解码，因此这里提供可配置尺寸的实现。
let decodedSize: { width: number; height: number } | null = { width: 512, height: 512 }

const stubDecodedSize = (size: { width: number; height: number } | null) => {
  decodedSize = size
}

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  crossOrigin: string | null = null
  referrerPolicy: string | null = null
  srcset = ''
  src = ''
  naturalWidth = 0
  naturalHeight = 0
  width = 0
  height = 0

  constructor() {
    queueMicrotask(() => {
      if (!decodedSize) {
        this.onerror?.()
        return
      }
      this.naturalWidth = decodedSize.width
      this.naturalHeight = decodedSize.height
      this.width = decodedSize.width
      this.height = decodedSize.height
      this.onload?.()
    })
  }
}

vi.stubGlobal('Image', MockImage)

/**
 * 裁剪对话框的解码替身；通过 createImage 接缝注入。
 * node 环境没有 document，宿主 <img> 也不会派发 load 事件，注入是唯一可靠路径。
 */
const createMockImage = () => {
  const image = {
    naturalWidth: 0,
    naturalHeight: 0,
    width: 0,
    height: 0,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    src: '',
  }
  queueMicrotask(() => {
    const size = decodedSize
    // 已撤销的 blob URL 无法解码。
    if (!size || revokedUrls.has(image.src)) {
      image.onerror?.()
      return
    }
    image.naturalWidth = size.width
    image.naturalHeight = size.height
    image.width = size.width
    image.height = size.height
    image.onload?.()
  })
  return image as unknown as HTMLImageElement
}

// 裁剪需要 object URL（node 环境不存在）。只补充静态方法，保留 URL 构造器本体，
// 否则会破坏 msw / react-query 内部对 new URL() 的使用。
// 每个 URL 唯一，且 revoke 之后真的无法再解码——否则 StrictMode 提前撤销 URL 的
// 回归（图片永远加载失败）在测试里会被静默放过。
const revokedUrls = new Set<string>()
let blobUrlSeq = 0

const RealURL = globalThis.URL
vi.stubGlobal('URL', Object.assign(RealURL, {
  createObjectURL: vi.fn(() => `blob:mock-avatar-${++blobUrlSeq}`),
  revokeObjectURL: vi.fn((url: string) => {
    revokedUrls.add(url)
  }),
}))

/** 裁剪画布替身；通过 AvatarCropDialog 的 createCanvas 接缝注入，避免改动全局 document。 */
const createMockCanvas = (size: number) =>
  ({
    width: size,
    height: size,
    getContext: () => ({
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low' as const,
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }),
    toBlob: (callback: (blob: Blob | null) => void) =>
      callback(new Blob(['cropped'], { type: 'image/jpeg' })),
  }) as unknown as HTMLCanvasElement

/** 构造带指定魔数的图片文件；padTo 用于测试大小边界。 */
const createImageFile = (
  name: string,
  magic: number[],
  options: { padTo?: number } = {},
): File => {
  const padTo = options.padTo ?? magic.length
  const bytes = new Uint8Array(Math.max(padTo, magic.length))
  bytes.set(magic.slice(0, Math.min(magic.length, bytes.length)))
  return new File([bytes as BlobPart], name)
}

const pickAvatar = async (renderer: ReactTestRenderer, file: File) => {
  // 组件会读取 currentTarget.files 并清空 value，因此事件需带完整 input 形状。
  const input = { files: [file], value: file.name }
  await act(async () => {
    renderer.root
      .findByProps({ 'data-testid': 'profile-avatar-input' })
      .props.onChange({ currentTarget: input, target: input })
  })
  await flush()
}

const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/** 取出 data-testid 对应元素的纯文本，兼容 MUI 的包装层与插值节点。 */
const textOf = (renderer: ReactTestRenderer, testId: string): string => {
  const collect = (node: ReactTestInstance): string =>
    node.children
      .map((child) => (typeof child === 'string' ? child : collect(child)))
      .join('')
  return collect(renderer.root.findByProps({ 'data-testid': testId }))
}

/** 记录文件选择器被触发的次数，用于验证按钮与头像两个入口。 */
const filePickerClicks = { count: 0 }

/**
 * react-test-renderer 默认不给宿主元素真节点，组件里的 ref 会拿到 null。
 * 这里为文件 input 提供最小可用的替身（裁剪解码已走 createImage 接缝）。
 */
const createNodeMock = (element: { props?: unknown }) => {
  const props = element.props as Record<string, unknown> | undefined
  const testId = props?.['data-testid']
  if (testId === 'profile-avatar-input') {
    return {
      value: '',
      click: () => {
        filePickerClicks.count += 1
      },
    }
  }
  return { naturalWidth: 512, naturalHeight: 512 }
}

const renderDialog = async (options: { strict?: boolean } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onClose = vi.fn()
  filePickerClicks.count = 0
  const tree = (
    <QueryClientProvider client={queryClient}>
      <SettingsDialog
        open
        onClose={onClose}
        createCanvas={createMockCanvas}
        createImage={createMockImage}
      />
    </QueryClientProvider>
  )
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(options.strict ? <StrictMode>{tree}</StrictMode> : tree, { createNodeMock })
  })
  await flush()
  return { renderer, onClose }
}

const waitForCropReady = async (renderer: ReactTestRenderer) => {
  await flush()
  expect(renderer.root.findByProps({ 'data-testid': 'avatar-crop-confirm' }).props.disabled).toBe(false)
}

/** 取裁剪框的样式；MUI 的包装层会让同一 testid 命中多个实例，取真正带 sx 的那个。 */
const cropFrameStyle = (renderer: ReactTestRenderer) => {
  const node = renderer.root
    .findAllByProps({ 'data-testid': 'avatar-crop-frame' })
    .find((instance) => {
      const sx = instance.props.sx
      return typeof sx === 'object' && sx !== null && 'left' in sx
    })
  if (!node) throw new Error('crop frame not found')
  return node.props.sx as { left: number; top: number; width: number; height: number }
}

/** 预览区节点：同一 testid 会命中包装层与宿主层，取真正挂了处理器的那个。 */
const cropViewport = (renderer: ReactTestRenderer) => {
  const node = renderer.root
    .findAllByProps({ 'data-testid': 'avatar-crop-viewport' })
    .find((instance) => typeof instance.props.onPointerDown === 'function')
  if (!node) throw new Error('crop viewport not found')
  return node
}

const pointerTarget = (setPointerCapture: () => void = vi.fn()) => ({
  setPointerCapture,
  releasePointerCapture: vi.fn(),
  hasPointerCapture: () => true,
})

/** 在预览区按下并拖动若干像素，模拟用户移动裁剪框。 */
const dragCropFrame = async (
  renderer: ReactTestRenderer,
  from: { x: number; y: number },
  to: { x: number; y: number },
  target = pointerTarget(),
) => {
  const viewport = cropViewport(renderer)
  const event = (x: number, y: number) => ({
    pointerId: 1,
    clientX: x,
    clientY: y,
    currentTarget: target,
  })

  await act(async () => {
    viewport.props.onPointerDown(event(from.x, from.y))
  })
  await act(async () => {
    viewport.props.onPointerMove(event(to.x, to.y))
  })
  await act(async () => {
    viewport.props.onPointerUp(event(to.x, to.y))
  })
  await flush()
}

/** 抓住右下角手柄并从 from 拖到 to，模拟缩放裁剪框。 */
const dragCropResizeHandle = async (
  renderer: ReactTestRenderer,
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  const handle = renderer.root
    .findAllByProps({ 'data-testid': 'avatar-crop-resize' })
    .find((instance) => typeof instance.props.onPointerDown === 'function')
  if (!handle) throw new Error('crop resize handle not found')

  const target = pointerTarget()
  const event = (x: number, y: number) => ({
    pointerId: 1,
    clientX: x,
    clientY: y,
    currentTarget: target,
    stopPropagation: vi.fn(),
  })

  await act(async () => {
    handle.props.onPointerDown(event(from.x, from.y))
  })
  await act(async () => {
    cropViewport(renderer).props.onPointerMove(event(to.x, to.y))
  })
  await act(async () => {
    cropViewport(renderer).props.onPointerUp(event(to.x, to.y))
  })
  await flush()
}

const clickCropConfirm = async (renderer: ReactTestRenderer) => {
  await act(async () => {
    renderer.root.findByProps({ 'data-testid': 'avatar-crop-confirm' }).props.onClick()
  })
  await flush()
}

const setNickname = (renderer: ReactTestRenderer, value: string) => {
  act(() =>
    renderer.root
      .findByProps({ 'data-testid': 'profile-nickname-input' })
      .props.onChange({ target: { value } }),
  )
}

const clickSave = async (renderer: ReactTestRenderer) => {
  await act(async () => {
    renderer.root.findByProps({ 'data-testid': 'profile-save' }).props.onClick()
  })
  await flush()
}

describe('SettingsDialog', () => {
  afterEach(async () => {
    await i18n.changeLanguage('zh')
    stubDecodedSize({ width: 512, height: 512 })
  })

  it('默认选中个人资料并展示昵称与用户 ID', async () => {
    const { renderer } = await renderDialog()

    expect(
      renderer.root.findByProps({ 'data-testid': 'profile-nickname-input' }).props.value,
    ).toBe('测试用户')
    expect(
      renderer.root.findByProps({ 'data-testid': 'profile-user-id' }).children.join(''),
    ).toBe('user-1')
    expect(
      renderer.root.findByProps({ 'data-testid': 'settings-nav-profile' }).props['aria-current'],
    ).toBe('page')
  })

  it('未修改时保存按钮不可用，修改后可用', async () => {
    const { renderer } = await renderDialog()

    expect(renderer.root.findByProps({ 'data-testid': 'profile-save' }).props.disabled).toBe(true)
    setNickname(renderer, '新的昵称')
    expect(renderer.root.findByProps({ 'data-testid': 'profile-save' }).props.disabled).toBe(false)
  })

  it('保存昵称调用 PATCH 并同步缓存', async () => {
    let serverNickname = '测试用户'
    const patchBodies: unknown[] = []
    mockServer.use(
      http.get(meUrl, () =>
        createSuccessResponse({
          user_id: 'user-1',
          nickname: serverNickname,
          avatar_url: 'https://cdn.example.com/avatars/user-1.png',
        }),
      ),
      http.patch(meUrl, async ({ request }) => {
        patchBodies.push(await request.json())
        serverNickname = (patchBodies.at(-1) as { nickname: string }).nickname
        return createNoContentResponse()
      }),
    )

    const { renderer } = await renderDialog()
    setNickname(renderer, '新的昵称')
    await clickSave(renderer)

    expect(patchBodies).toEqual([{ nickname: '新的昵称' }])
    expect(renderer.root.findByProps({ 'data-testid': 'profile-saved' })).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'data-testid': 'profile-nickname-input' }).props.value,
    ).toBe('新的昵称')
    expect(renderer.root.findByProps({ 'data-testid': 'profile-save' }).props.disabled).toBe(true)
  })

  it('保存失败时展示错误并保留草稿', async () => {
    mockServer.use(http.patch(meUrl, () => createErrorResponse(500, 'boom', 500_001)))

    const { renderer } = await renderDialog()
    setNickname(renderer, '新的昵称')
    await clickSave(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'profile-save-error' })).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'data-testid': 'profile-nickname-input' }).props.value,
    ).toBe('新的昵称')
  })

  it('切换到通用分区即时切换界面语言', async () => {
    const { renderer } = await renderDialog()

    act(() => renderer.root.findByProps({ 'data-testid': 'settings-nav-general' }).props.onClick())

    const group = renderer.root.findByType(ToggleButtonGroup)
    expect(group.props.value).toBe('zh')
    await act(async () => {
      group.props.onChange(null, 'en')
    })

    expect(i18n.resolvedLanguage).toBe('en')
  })

  it('按钮与头像本身都能触发文件选择', async () => {
    const { renderer } = await renderDialog()

    act(() => renderer.root.findByProps({ 'data-testid': 'profile-avatar-select' }).props.onClick())
    expect(filePickerClicks.count).toBe(1)

    act(() => renderer.root.findByProps({ 'data-testid': 'profile-avatar-trigger' }).props.onClick())
    expect(filePickerClicks.count).toBe(2)
  })

  it('列出头像的格式与大小限制', async () => {
    const { renderer } = await renderDialog()

    const text = textOf(renderer, 'profile-avatar-constraints')

    expect(text).toContain('PNG')
    expect(text).toContain('JPEG')
    expect(text).toContain('1MB')
  })

  it('拒绝超限图片并给出提示，不进入裁剪', async () => {
    const { renderer } = await renderDialog()

    // 2MB 的 PNG：命中大小限制。
    const oversized = createImageFile('huge.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], {
      padTo: 2 * 1024 * 1024,
    })
    await pickAvatar(renderer, oversized)

    expect(textOf(renderer, 'profile-avatar-error')).toContain('1MB')
    expect(renderer.root.findAllByProps({ 'data-testid': 'avatar-crop-dialog' })).toHaveLength(0)
  })

  it('拒绝非 PNG/JPEG 格式', async () => {
    const { renderer } = await renderDialog()

    await pickAvatar(renderer, createImageFile('a.gif', [0x47, 0x49, 0x46, 0x38]))

    expect(textOf(renderer, 'profile-avatar-error')).toContain('PNG')
  })

  it('不再限制尺寸：超大图片直接进入裁剪', async () => {
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 4096, height: 2048 })

    await pickAvatar(
      renderer,
      createImageFile('wide.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )

    expect(renderer.root.findAllByProps({ 'data-testid': 'profile-avatar-error' })).toHaveLength(0)
    expect(renderer.root.findAllByProps({ 'data-testid': 'avatar-crop-dialog' }).length).toBeGreaterThan(0)
    await waitForCropReady(renderer)
  })

  it('合法图片进入裁剪，确认后上传头像并同步缓存', async () => {
    let uploadCount = 0
    mockServer.use(
      http.post('http://127.0.0.1:4173/api/v1/user/me/avatar', () => {
        uploadCount += 1
        return createSuccessResponse({ avatar_url: 'https://cdn.example.com/avatars/new.png' })
      }),
    )

    const { renderer } = await renderDialog()
    await pickAvatar(
      renderer,
      createImageFile('ok.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )

    // 校验通过后应弹出裁剪对话框，此时还没有发请求。
    expect(renderer.root.findByProps({ 'data-testid': 'avatar-crop-dialog' })).toBeTruthy()
    expect(uploadCount).toBe(0)

    await waitForCropReady(renderer)
    await clickCropConfirm(renderer)

    expect(uploadCount).toBe(1)
    expect(renderer.root.findByProps({ 'data-testid': 'profile-avatar-saved' })).toBeTruthy()
    // 裁剪对话框在成功后关闭。
    expect(renderer.root.findAllByProps({ 'data-testid': 'avatar-crop-dialog' })).toHaveLength(0)
  })

  it('StrictMode 下仍能解码并进入可裁剪状态', async () => {
    // StrictMode 会 setup→cleanup→setup。若 object URL 在 cleanup 中被撤销且第二次
    // setup 复用它，<img> 与解码都会拿到失效的 blob URL，裁剪框永远不会就绪。
    const { renderer } = await renderDialog({ strict: true })

    await pickAvatar(
      renderer,
      createImageFile('ok.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )

    expect(renderer.root.findAllByProps({ 'data-testid': 'profile-avatar-error' })).toHaveLength(0)
    await waitForCropReady(renderer)
    // MUI 的 Box 会让 findAllByProps 同时命中包装组件与宿主节点，只断言存在。
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'avatar-crop-image' }).length,
    ).toBeGreaterThan(0)
  })

  it('非正方形图片：虚线框尺寸等于真实选区，且能拖动改变选区', async () => {
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 1024, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('wide.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)

    // 短边 512、完整可见比例 320/1024 = 0.3125 → 框 160×160。
    // 图宽铺满视口（左右无边距），高 160 居中 → 上下各留 80。
    const initial = cropFrameStyle(renderer)
    expect(initial.width).toBe(160)
    expect(initial.height).toBe(160)
    expect(initial.left).toBe(80)
    expect(initial.top).toBe(80)

    // 右移 40px → 源图 128px，选区随之右移，框也要跟着动。
    await dragCropFrame(renderer, { x: 100, y: 100 }, { x: 140, y: 100 })

    const moved = cropFrameStyle(renderer)
    expect(moved.left).toBe(120)
    expect(moved.width).toBe(160)
  })

  it('拖动裁剪框会被夹在图片范围内，不会越界', async () => {
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 1024, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('wide.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)

    // 往右下拖到远超边界：框的右/下边应恰好贴住图片边缘。
    await dragCropFrame(renderer, { x: 10, y: 10 }, { x: 9999, y: 9999 })

    const frame = cropFrameStyle(renderer)
    // 图宽铺满视口 → 右边 = 320；图高 160 居中 → 下边 = 80 + 160。
    expect(frame.left + frame.width).toBeCloseTo(320)
    expect(frame.top + frame.height).toBeCloseTo(240)
  })

  it('正方形图片：裁剪框覆盖整张图，拖动不改变选区', async () => {
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 512, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('square.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)

    expect(cropFrameStyle(renderer)).toMatchObject({ left: 0, top: 0, width: 320, height: 320 })

    await dragCropFrame(renderer, { x: 100, y: 100 }, { x: 260, y: 260 })

    // 最大内接正方形就是整张图，无处可移。
    expect(cropFrameStyle(renderer)).toMatchObject({ left: 0, top: 0 })
  })

  it('正方形图片：拖手柄可缩小裁剪框，之后就能移动选区', async () => {
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 512, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('square.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)

    // 初始为最大内接正方形：铺满整张图，无处可移。
    expect(cropFrameStyle(renderer)).toMatchObject({ left: 0, top: 0, width: 320, height: 320 })

    // 拖手柄到 (160,160)：显示边长 160 → 源图 256（正好是输出边长下限）。
    await dragCropResizeHandle(renderer, { x: 320, y: 320 }, { x: 160, y: 160 })

    const resized = cropFrameStyle(renderer)
    expect(resized.width).toBeCloseTo(160)
    expect(resized.height).toBeCloseTo(160)

    // 缩小之后选区就有移动余地了。
    const before = resized.left
    await dragCropFrame(renderer, { x: 100, y: 100 }, { x: 140, y: 100 })
    expect(cropFrameStyle(renderer).left).toBeGreaterThan(before)
  })

  it('缩放按位移计算，不受对话框在屏幕上的位置影响', async () => {
    const { renderer } = await renderDialog()
    // 横图：上下留白使 imageTop 不为 0，暴露「绝对坐标 - 预览区坐标」的原点错位。
    stubDecodedSize({ width: 1024, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('wide.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)
    expect(cropFrameStyle(renderer).width).toBe(160)

    // 用远离原点的 client 坐标抓取手柄：若用绝对坐标算尺寸，会立刻顶到上限而毫无变化。
    await dragCropResizeHandle(renderer, { x: 700, y: 640 }, { x: 660, y: 600 })

    // 位移 -40px、比例 0.3125 → 源图 512 - 128 = 384 → 显示 120。
    expect(cropFrameStyle(renderer).width).toBeCloseTo(120)
  })

  it('缩放不会小于输出边长，避免放大导致模糊', async () => {
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 512, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('square.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)

    // 拼命往左上拖：源图边长不会低于 256 → 显示边长 256 × 0.625 = 160。
    await dragCropResizeHandle(renderer, { x: 320, y: 320 }, { x: 0, y: 0 })

    expect(cropFrameStyle(renderer).width).toBeCloseTo(160)
  })

  it('setPointerCapture 抛错时拖拽依然可用', async () => {
    // 浏览器在指针非活动等情况下会抛错；若拖拽状态在捕获之后才写入，整个拖拽就废了。
    const { renderer } = await renderDialog()
    stubDecodedSize({ width: 1024, height: 512 })

    await pickAvatar(
      renderer,
      createImageFile('wide.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)

    const throwing = pointerTarget(() => {
      throw new Error('InvalidPointerId')
    })
    await dragCropFrame(renderer, { x: 100, y: 100 }, { x: 140, y: 100 }, throwing)

    expect(cropFrameStyle(renderer).left).toBeCloseTo(120)
  })

  it('裁剪对话框可以取消，且不发请求', async () => {
    let uploadCount = 0
    mockServer.use(
      http.post('http://127.0.0.1:4173/api/v1/user/me/avatar', () => {
        uploadCount += 1
        return createSuccessResponse({ avatar_url: 'https://cdn.example.com/a.png' })
      }),
    )

    const { renderer } = await renderDialog()
    await pickAvatar(
      renderer,
      createImageFile('ok.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )

    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'avatar-crop-cancel' }).props.onClick()
    })

    expect(renderer.root.findAllByProps({ 'data-testid': 'avatar-crop-dialog' })).toHaveLength(0)
    expect(uploadCount).toBe(0)
  })

  it('上传失败时展示错误', async () => {
    mockServer.use(
      http.post('http://127.0.0.1:4173/api/v1/user/me/avatar', () =>
        createErrorResponse(500, 'boom', 500_001),
      ),
    )

    const { renderer } = await renderDialog()
    await pickAvatar(
      renderer,
      createImageFile('ok.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], { padTo: 1024 }),
    )
    await waitForCropReady(renderer)
    await clickCropConfirm(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'profile-avatar-upload-error' })).toBeTruthy()
  })
})
