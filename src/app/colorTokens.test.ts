import { describe, expect, it } from 'vitest'

/**
 * 设计系统守卫：颜色只能来自 token 层。
 *
 * 深色模式最容易的坏法不是「少写一处」，而是有人在组件里直接写 `#fff` ——
 * 浅色下没人发现，深色下直接白块。这里把「允许写死颜色的地方」显式列出来，
 * 每条都给出理由；新增组件若写死颜色会在这里失败。
 *
 * 对应 design.md「What pages MUST share → No hard-coded colours」。
 */

const sourceModules = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 颜色字面量：#rgb / #rrggbb / rgb() / rgba(。 */
const COLOR_LITERAL_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/

/** glob 的 key 相对本文件目录（src/app），这里还原成 src/ 下的规范路径。 */
const toSourcePath = (key: string) => {
  const parts = ['src', 'app']
  key.split('/').forEach((segment) => {
    if (!segment || segment === '.') {
      return
    }
    if (segment === '..') {
      parts.pop()
      return
    }
    parts.push(segment)
  })
  return parts.join('/')
}

/** 允许出现颜色字面量的文件与理由。 */
const ALLOWED_LITERAL_FILES: Array<{ path: string; reason: string }> = [
  { path: 'src/app/theme.ts', reason: 'MUI 主题的十六进制桥接值，本身就是 token 层' },
  { path: 'src/app/colorMode.ts', reason: '地址栏 theme-color 必须与 index.html 首帧脚本同源' },
  {
    path: 'src/components/notebook-workspace/shared/ui/workspaceColorPalette.ts',
    reason: '语义色板（浅色 + 深色两套）',
  },
  {
    path: 'src/components/notebook-workspace/shared/ui/workspaceElevation.ts',
    reason: '浮起 / 阴影 token（浅色 + 深色两套）',
  },
  {
    path: 'src/components/notebook-workspace/shared/ui/scrollbar.ts',
    reason: '主题没挂色板时的兜底，按模式给一深一浅两版',
  },
  { path: 'src/components/auth/ProviderIcon.tsx', reason: '第三方品牌标志保持官方配色' },
  {
    path: 'src/components/notebook-workspace/panel/studio/components/StudioVideoPlayer.tsx',
    reason: '视频上方的黑色遮罩与白色控件压在画面上，两种模式一致',
  },
  { path: 'src/components/settings/AvatarCropDialog.tsx', reason: '裁剪取景框压在照片上' },
  {
    path: 'src/components/settings/ProfileSettingsSection.tsx',
    reason: '头像 hover 遮罩压在照片上，与主题无关',
  },
  { path: 'src/lib/avatarImage.ts', reason: '裁剪导出 JPEG 时铺白底，与界面主题无关' },
]

const allowedPaths = new Set(ALLOWED_LITERAL_FILES.map(({ path }) => path))

const scannedFiles = Object.entries(sourceModules).map(([key, source]) => ({
  path: toSourcePath(key),
  source,
}))

const violations = scannedFiles
  .filter(({ path }) => !path.includes('.test.') && !allowedPaths.has(path))
  .flatMap(({ path, source }) =>
    source
      .split('\n')
      .map((line, index) => ({ path, line: index + 1, text: line.trim() }))
      .filter(({ text }) => COLOR_LITERAL_PATTERN.test(text)),
  )

describe('颜色 token 守卫', () => {
  it('除白名单外，组件里不出现写死的颜色', () => {
    expect(
      violations.map(({ path, line, text }) => `${path}:${line}  ${text}`),
      '写死的颜色在深色模式下不会跟着变：请改用 theme.palette / theme.workspacePalette / '
        + 'theme.workspaceElevation，或把确属例外的文件加进 ALLOWED_LITERAL_FILES 并写明理由',
    ).toEqual([])
  })

  it('白名单里的文件确实还存在（避免清单腐化）', () => {
    const paths = scannedFiles.map(({ path }) => path)
    ALLOWED_LITERAL_FILES.forEach(({ path }) => {
      expect(paths, `白名单中的 ${path} 已不存在，请清理`).toContain(path)
    })
  })

  it('扫描确实覆盖了组件源码', () => {
    expect(scannedFiles.length).toBeGreaterThan(100)
    expect(scannedFiles.some(({ path }) => path === 'src/app/theme.ts')).toBe(true)
    expect(scannedFiles.some(({ path }) => path.endsWith('panel/chat/ChatPanel.tsx'))).toBe(true)
  })
})
