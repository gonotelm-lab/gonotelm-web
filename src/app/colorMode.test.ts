import { afterEach, describe, expect, it, vi } from 'vitest'
// 用 Vite 的 raw 导入读首帧脚本源码：app 的 tsconfig 没有开 node 类型。
import indexHtml from '../../index.html?raw'
import { LOCAL_PREFERENCES_STORAGE_KEY } from '@/lib/localPreferences'
import {
  COLOR_MODE_ATTRIBUTE,
  COLOR_MODES,
  DEFAULT_COLOR_MODE,
  FAVICON_ELEMENT_ID,
  FAVICON_HREF_BY_MODE,
  SYSTEM_DARK_MEDIA_QUERY,
  THEME_COLOR_BY_MODE,
  applyColorModeToDocument,
  isColorMode,
  parseColorMode,
  readSystemPrefersDark,
  resolveColorMode,
  subscribeToSystemColorMode,
  type ColorMode,
} from './colorMode'

const createFakeDocument = () => {
  const attributes = new Map<string, string>()
  const attributesBySelector = new Map<string, Map<string, string>>()
  const root = {
    setAttribute: vi.fn((name: string, value: string) => {
      attributes.set(name, value)
    }),
    style: {} as CSSStyleDeclaration,
  }
  const element = (key: string) => ({
    setAttribute: vi.fn((name: string, value: string) => {
      const target = attributesBySelector.get(key) ?? new Map<string, string>()
      target.set(name, value)
      attributesBySelector.set(key, target)
    }),
  })
  return {
    documentElement: root,
    getElementById: vi.fn((id: string) => (id === FAVICON_ELEMENT_ID ? element('favicon') : null)),
    querySelector: vi.fn((selector: string) => element(selector)),
    attributes,
    attributesBySelector,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseColorMode', () => {
  it('接受三种模式，其余一律回落默认浅色', () => {
    expect(COLOR_MODES).toEqual(['light', 'dark', 'system'])
    expect(DEFAULT_COLOR_MODE).toBe('light')

    COLOR_MODES.forEach((mode) => {
      expect(isColorMode(mode)).toBe(true)
      expect(parseColorMode(mode)).toBe(mode)
    })

    expect(parseColorMode(null)).toBe('light')
    expect(parseColorMode(undefined)).toBe('light')
    expect(parseColorMode('')).toBe('light')
    expect(parseColorMode('DARK')).toBe('light')
    expect(parseColorMode('{}')).toBe('light')
  })
})

describe('resolveColorMode', () => {
  it('system 跟随系统偏好，显式选择不受系统影响', () => {
    expect(resolveColorMode('light', true)).toBe('light')
    expect(resolveColorMode('light', false)).toBe('light')
    expect(resolveColorMode('dark', true)).toBe('dark')
    expect(resolveColorMode('dark', false)).toBe('dark')
    expect(resolveColorMode('system', true)).toBe('dark')
    expect(resolveColorMode('system', false)).toBe('light')
  })
})

describe('系统配色订阅', () => {
  it('没有 matchMedia 时按浅色处理且订阅是 noop', () => {
    expect(readSystemPrefersDark()).toBe(false)
    expect(subscribeToSystemColorMode(() => {})).toBeTypeOf('function')
  })

  it('把系统配色变化转成回调，并支持取消订阅', () => {
    const listeners = new Set<(event: { matches: boolean }) => void>()
    vi.stubGlobal('window', {
      matchMedia: (query: string) => {
        expect(query).toBe(SYSTEM_DARK_MEDIA_QUERY)
        return {
          matches: true,
          addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
            listeners.add(listener)
          },
          removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
            listeners.delete(listener)
          },
        }
      },
    })

    expect(readSystemPrefersDark()).toBe(true)

    const seen: boolean[] = []
    const unsubscribe = subscribeToSystemColorMode((prefersDark) => seen.push(prefersDark))

    listeners.forEach((listener) => listener({ matches: true }))
    expect(seen).toEqual([true])

    unsubscribe()
    expect(listeners.size).toBe(0)
  })
})

describe('applyColorModeToDocument', () => {
  it('写 data-theme / color-scheme / 图标 / 地址栏颜色', () => {
    const fakeDocument = createFakeDocument()
    vi.stubGlobal('document', fakeDocument)

    applyColorModeToDocument('dark')
    expect(fakeDocument.attributes.get(COLOR_MODE_ATTRIBUTE)).toBe('dark')
    expect(fakeDocument.documentElement.style.colorScheme).toBe('dark')
    expect(fakeDocument.attributesBySelector.get('favicon')?.get('href')).toBe(
      FAVICON_HREF_BY_MODE.dark,
    )
    expect(
      fakeDocument.attributesBySelector
        .get('meta[name="theme-color"]')
        ?.get('content'),
    ).toBe(THEME_COLOR_BY_MODE.dark)

    applyColorModeToDocument('light')
    expect(fakeDocument.attributes.get(COLOR_MODE_ATTRIBUTE)).toBe('light')
    expect(fakeDocument.documentElement.style.colorScheme).toBe('light')
    expect(fakeDocument.attributesBySelector.get('favicon')?.get('href')).toBe(
      FAVICON_HREF_BY_MODE.light,
    )
  })

  it('没有 document 时（node 测试环境）不抛错', () => {
    expect(() => applyColorModeToDocument('dark')).not.toThrow()
  })
})

describe('index.html 首帧脚本', () => {
  const html = indexHtml

  it('与 colorMode.ts / localPreferences 共用同一份键名、默认值与资源映射', () => {
    // 键名 / 属性名 / 默认值
    expect(html).toContain(LOCAL_PREFERENCES_STORAGE_KEY)
    expect(html).toContain(COLOR_MODE_ATTRIBUTE)
    expect(html).toContain(`'${DEFAULT_COLOR_MODE}'`)
    COLOR_MODES.forEach((mode: ColorMode) => {
      expect(html).toContain(`'${mode}'`)
    })

    // 图标与地址栏配色
    expect(html).toContain(FAVICON_HREF_BY_MODE.light)
    expect(html).toContain(FAVICON_HREF_BY_MODE.dark)
    expect(html).toContain(THEME_COLOR_BY_MODE.light)
    expect(html).toContain(THEME_COLOR_BY_MODE.dark)

    // 首帧必须在模块脚本之前执行，否则会闪一帧错色。
    expect(html.indexOf('data-theme')).toBeLessThan(html.indexOf('src="/src/main.tsx"'))
  })

  it('用单张图标 + id 承接运行时切换', () => {
    expect(html).toContain(`id="${FAVICON_ELEMENT_ID}"`)
    // 旧写法按系统偏好挂两张图标，会让「应用内选了深色」的标签页图标对不上。
    expect(html).not.toContain('media="(prefers-color-scheme: dark)"')
  })

  /**
   * 行为对齐：把首帧脚本原样跑一遍，看它和 `resolveColorMode` / 资源映射是否得出同一结果。
   * 只比对字符串会漏掉「键名对了但逻辑写反」这类问题。
   */
  describe('首帧脚本的行为与 colorMode.ts 一致', () => {
    const scriptSource = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? ''

    const runFirstPaintScript = (options: {
      prefsColorMode?: string
      prefersDark: boolean
    }) => {
      const root = { setAttribute: vi.fn(), style: {} as CSSStyleDeclaration }
      const favicon = { setAttribute: vi.fn() }
      const themeColor = { setAttribute: vi.fn() }
      const fakeWindow = {
        localStorage: {
          getItem: (key: string) => {
            if (key === LOCAL_PREFERENCES_STORAGE_KEY && options.prefsColorMode !== undefined) {
              return JSON.stringify({ colorMode: options.prefsColorMode })
            }
            return null
          },
        },
        matchMedia: () => ({ matches: options.prefersDark }),
      }
      const fakeDocument = {
        documentElement: root,
        getElementById: () => favicon,
        querySelector: () => themeColor,
      }

      new Function('window', 'document', scriptSource)(fakeWindow, fakeDocument)

      return {
        theme: root.setAttribute.mock.calls.find(([name]) => name === COLOR_MODE_ATTRIBUTE)?.[1],
        colorScheme: root.style.colorScheme,
        faviconHref: favicon.setAttribute.mock.calls.find(([name]) => name === 'href')?.[1],
        themeColor: themeColor.setAttribute.mock.calls.find(([name]) => name === 'content')?.[1],
      }
    }

    it('脚本存在且能执行', () => {
      expect(scriptSource).toContain(LOCAL_PREFERENCES_STORAGE_KEY)
      expect(scriptSource).not.toContain('gonotelm.colorMode')
    })

    it.each([
      { label: '没得选 → 浅色', prefersDark: false, expected: 'light' as const },
      { label: '没得选（系统深色）→ 浅色', prefersDark: true, expected: 'light' as const },
      {
        label: '统一偏好深色 → 深色',
        prefsColorMode: 'dark',
        prefersDark: false,
        expected: 'dark' as const,
      },
      {
        label: '统一偏好浅色（系统深色）→ 浅色',
        prefsColorMode: 'light',
        prefersDark: true,
        expected: 'light' as const,
      },
      {
        label: '跟随系统 + 系统深色 → 深色',
        prefsColorMode: 'system',
        prefersDark: true,
        expected: 'dark' as const,
      },
      {
        label: '跟随系统 + 系统浅色 → 浅色',
        prefsColorMode: 'system',
        prefersDark: false,
        expected: 'light' as const,
      },
      {
        label: '统一偏好写脏 → 浅色',
        prefsColorMode: 'midnight',
        prefersDark: true,
        expected: 'light' as const,
      },
    ])('$label', ({ prefsColorMode, prefersDark, expected }) => {
      const result = runFirstPaintScript({ prefsColorMode, prefersDark })
      expect(resolveColorMode(parseColorMode(prefsColorMode), prefersDark)).toBe(expected)
      expect(result.theme).toBe(expected)
      expect(result.faviconHref).toBe(FAVICON_HREF_BY_MODE[expected])
      expect(result.themeColor).toBe(THEME_COLOR_BY_MODE[expected])
      expect(result.colorScheme).toBe(expected)
    })
  })
})
