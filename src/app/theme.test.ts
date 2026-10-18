import { describe, expect, it } from 'vitest'
import type { WorkspaceColorPalette } from '@/components/notebook-workspace/shared/ui/workspaceColorPalette'
import {
  workspaceColorPalette,
  workspaceDarkColorPalette,
} from '@/components/notebook-workspace/shared/ui/workspaceColorPalette'
import {
  workspaceElevation,
  workspaceElevationDark,
} from '@/components/notebook-workspace/shared/ui/workspaceElevation'
import { darkTheme, lightTheme, resolveAppTheme } from './theme'

/**
 * 配色的协调性是这份工作的验收点，所以这里把它测出来：
 * 结构契约（两套色板同形）、深色对比度契约（新写的深色必须达标）、
 * 以及浅色不得回退（既有数值被冻结）。
 */

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const relativeLuminance = (hex: string) => {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (foreground: string, background: string) => {
  const [hi, lo] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  )
  return (hi + 0.05) / (lo + 0.05)
}

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value)

const palettePaths = (palette: WorkspaceColorPalette): string[] => {
  const paths: string[] = []
  const walk = (value: unknown, prefix: string) => {
    if (typeof value === 'string' || typeof value === 'number') {
      paths.push(prefix)
      return
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => walk(child, prefix ? `${prefix}.${key}` : key))
    }
  }
  walk(palette, '')
  return paths.sort()
}

const readPath = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, source)

describe('主题装配', () => {
  it('按解析后的模式取主题', () => {
    expect(resolveAppTheme('light')).toBe(lightTheme)
    expect(resolveAppTheme('dark')).toBe(darkTheme)
    expect(lightTheme.palette.mode).toBe('light')
    expect(darkTheme.palette.mode).toBe('dark')
  })

  it('两套主题都把色板与浮起 token 挂在 theme 上', () => {
    // createTheme 会深拷贝 ThemeOptions，所以比结构而不是引用。
    expect(lightTheme.workspacePalette).toEqual(workspaceColorPalette)
    expect(darkTheme.workspacePalette).toEqual(workspaceDarkColorPalette)
    expect(lightTheme.workspaceElevation).toEqual(workspaceElevation)
    expect(darkTheme.workspaceElevation).toEqual(workspaceElevationDark)
  })
})

describe('两套色板结构一致', () => {
  it('键路径完全相同（组件里不会出现只在某一模式下存在的分支）', () => {
    expect(palettePaths(workspaceDarkColorPalette)).toEqual(palettePaths(workspaceColorPalette))
  })

  it('浮起 token 键相同且两套取值不同', () => {
    expect(Object.keys(workspaceElevationDark).sort()).toEqual(
      Object.keys(workspaceElevation).sort(),
    )
    Object.keys(workspaceElevation).forEach((key) => {
      expect(readPath(workspaceElevationDark, key)).not.toBe(readPath(workspaceElevation, key))
    })
  })

  it('深色不是浅色的复制：每个语义色都真的换过值', () => {
    const semantics = [
      'overlay.backdropColor',
      'overlay.backdropAlpha',
      'scrollbar.hoverThumbRgb',
      'flowLoading.rgbColor',
      'code.surface',
      ...Object.keys(workspaceColorPalette.sourceType).map((key) => `sourceType.${key}.accent`),
      ...Object.keys(workspaceColorPalette.artifactKind).map(
        (key) => `artifactKind.${key}.accent`,
      ),
    ]
    semantics.forEach((path) => {
      expect(readPath(workspaceDarkColorPalette, path)).not.toBe(
        readPath(workspaceColorPalette, path),
      )
    })
  })

  it('思维导图与任务状态两套明暗变体都保留（canvas 自绘需要成对取值）', () => {
    expect(workspaceDarkColorPalette.mindmap.light).toEqual(workspaceColorPalette.mindmap.light)
    expect(workspaceDarkColorPalette.mindmap.dark).toEqual(workspaceColorPalette.mindmap.dark)
    expect(workspaceDarkColorPalette.artifactList.light).toEqual(
      workspaceColorPalette.artifactList.light,
    )
    expect(workspaceDarkColorPalette.artifactList.dark).toEqual(
      workspaceColorPalette.artifactList.dark,
    )
  })
})

/**
 * 深色对比度契约：正文/次级文字按 WCAG AA 起步，图标与语义色按图形对象 3:1 起步。
 * 括号里的数字是本套色板的实测值，改色时这些断言会立刻挡住「暗到看不见」的改动。
 */
describe('深色对比度契约', () => {
  const { palette } = darkTheme

  it.each([
    { label: '正文 / 卡片', fg: palette.text.primary, bg: palette.background.paper, min: 10 },
    { label: '正文 / 画布', fg: palette.text.primary, bg: palette.background.default, min: 10 },
    { label: '次级文字 / 卡片', fg: palette.text.secondary, bg: palette.background.paper, min: 4.5 },
    {
      label: '次级文字 / 画布',
      fg: palette.text.secondary,
      bg: palette.background.default,
      min: 4.5,
    },
    {
      label: '主按钮文字 / 主色填充',
      fg: palette.primary.contrastText,
      bg: palette.primary.main,
      min: 4.5,
    },
    {
      label: '主按钮文字 / 主色 hover 填充',
      fg: palette.primary.contrastText,
      bg: palette.primary.dark,
      min: 4.5,
    },
    { label: '主色（链接/图标）/ 卡片', fg: palette.primary.main, bg: palette.background.paper, min: 4.5 },
    { label: '成功 / 卡片', fg: palette.success.main, bg: palette.background.paper, min: 4.5 },
    { label: '错误 / 卡片', fg: palette.error.main, bg: palette.background.paper, min: 4.5 },
    { label: '警告 / 卡片', fg: palette.warning.main, bg: palette.background.paper, min: 4.5 },
    {
      label: '代码文字 / 代码底色',
      fg: palette.text.primary,
      bg: workspaceDarkColorPalette.code.surface,
      min: 7,
    },
  ])('$label ≥ $min:1', ({ fg, bg, min }) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min)
  })

  it('发丝线看得见但不过重（1.2–2.0:1）', () => {
    expect(contrast(palette.divider, palette.background.paper)).toBeGreaterThan(1.2)
    expect(contrast(palette.divider, palette.background.paper)).toBeLessThan(2)
  })

  it('代码底色与卡片区分得开，但仍是同一套暗色', () => {
    const separation = contrast(workspaceDarkColorPalette.code.surface, palette.background.paper)
    expect(separation).toBeGreaterThan(1.05)
    expect(separation).toBeLessThan(1.4)
  })

  it('每个来源 / artifact 标记色在深色卡片上都读得出（≥4.5:1）', () => {
    const tones = [
      ...Object.entries(workspaceDarkColorPalette.sourceType),
      ...Object.entries(workspaceDarkColorPalette.artifactKind),
    ]
    tones.forEach(([key, tone]) => {
      expect(isHex(tone.accent), `${key} 的 accent 必须是十六进制`).toBe(true)
      expect(contrast(tone.accent, palette.background.paper), key).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('任务状态色在深色卡片上都读得出（≥4.5:1）', () => {
    Object.entries(workspaceDarkColorPalette.artifactList.dark).forEach(([state, tone]) => {
      expect(contrast(tone.accent, palette.background.paper), state).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('思维导图节点 / 文字 / 边在深色画布上都有足够分离', () => {
    const tone = workspaceDarkColorPalette.mindmap.dark
    expect(contrast(tone.textPrimary, tone.surface)).toBeGreaterThanOrEqual(10)
    expect(contrast(tone.level0Text, tone.level0Background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tone.level1Text, tone.level1Background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tone.edge, tone.surface)).toBeGreaterThan(1.2)
    expect(contrast(tone.edgeHighlight, tone.surface)).toBeGreaterThan(4.5)
    expect(contrast(tone.nodeBorder, tone.nodeBackground)).toBeGreaterThan(1.25)
  })
})

/**
 * 浅色基线：这些是本次改动之前就存在的实测对比度，只允许不变或变好。
 * 深色化不应该顺手把浅色的阅读体验改掉。
 */
describe('浅色基线不回退', () => {
  const { palette } = lightTheme

  it.each([
    { label: '正文 / 卡片', fg: palette.text.primary, bg: palette.background.paper, min: 13 },
    { label: '正文 / 画布', fg: palette.text.primary, bg: palette.background.default, min: 12 },
    { label: '次级文字 / 卡片', fg: palette.text.secondary, bg: palette.background.paper, min: 6 },
    {
      label: '主按钮文字 / 主色填充',
      fg: palette.primary.contrastText,
      bg: palette.primary.main,
      min: 5.5,
    },
    { label: '主色 / 卡片', fg: palette.primary.main, bg: palette.background.paper, min: 5.5 },
    {
      label: '主按钮文字 / 主色 hover 填充',
      fg: palette.primary.contrastText,
      bg: palette.primary.dark,
      min: 7,
    },
    { label: '错误 / 卡片', fg: palette.error.main, bg: palette.background.paper, min: 4.3 },
    // 浅色的琥珀 warning 本来就只有 2.66:1：只用在图标上，属于既有设计，不在这里改。
    {
      label: '警告 / 卡片（既有基线）',
      fg: palette.warning.main,
      bg: palette.background.paper,
      min: 2.6,
    },
  ])('$label ≥ $min:1', ({ fg, bg, min }) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min)
  })

  it('浅色的发丝线与代码底色保持原样', () => {
    expect(palette.divider).toBe('#d8d2c6')
    expect(workspaceColorPalette.code.surface).toBe('#f0efe8')
    expect(contrast(palette.divider, palette.background.paper)).toBeGreaterThan(1.2)
  })

  it('浅色语义色是既有取值', () => {
    expect(palette.primary.main).toBe('#2f6b4f')
    expect(palette.background.default).toBe('#efebe2')
    expect(palette.background.paper).toBe('#f7f4ed')
    expect(palette.text.primary).toBe('#1c2a22')
    expect(workspaceColorPalette.sourceType.pdf.accent).toBe('#a65d48')
    expect(workspaceColorPalette.artifactKind.slides.accent).toBe('#8a5a3c')
  })
})
