import { alpha, createTheme } from '@mui/material/styles'
import type { WorkspaceColorPalette } from '@/components/notebook-workspace/shared/ui/workspaceColorPalette'
import {
  workspaceColorPalette,
  workspaceDarkColorPalette,
} from '@/components/notebook-workspace/shared/ui/workspaceColorPalette'
import type { WorkspaceElevation } from '@/components/notebook-workspace/shared/ui/workspaceElevation'
import {
  workspaceElevation,
  workspaceElevationDark,
} from '@/components/notebook-workspace/shared/ui/workspaceElevation'
import { subtleScrollbarSx } from '@/components/notebook-workspace/shared/ui/scrollbar'
import { workspaceTypeRem } from '@/components/notebook-workspace/shared/ui/typeTokens'
import { workspaceMotion } from '@/components/notebook-workspace/shared/ui/motionTokens'
import type { ResolvedColorMode } from './colorMode'

/* Hallmark · genre: editorial · theme: Studio (light) / Studio Night (dark) · design-system: design.md */

declare module '@mui/material/styles' {
  interface Theme {
    workspacePalette: WorkspaceColorPalette
    workspaceElevation: WorkspaceElevation
  }

  interface ThemeOptions {
    workspacePalette?: WorkspaceColorPalette
    workspaceElevation?: WorkspaceElevation
  }
}

/**
 * 主题里被 MUI 组件覆写直接引用的十六进制桥接值（tokens.css 的镜像）。
 * 两套值的键完全相同，组件覆写因此不出现模式分支。
 */
interface StudioTokens {
  paper: string
  paper2: string
  paper3: string
  ink: string
  ink2: string
  rule: string
  accent: string
  accentLight: string
  accentDeep: string
  accentInk: string
  success: string
  error: string
  warning: string
  /** 填充色上的文字：浅色下用奶白，深色下反过来用深墨。 */
  onAccent: string
  /** 警告色是唯一的暖黄底，浅色下配深墨、深色下同样配深墨。 */
  onWarning: string
  secondaryMain: string
  secondaryLight: string
  secondaryDark: string
  secondaryContrast: string
  tooltipSurface: string
  tooltipText: string
  /** 交互态叠加的不透明度：深色界面需要更明显的洗色才看得出 hover / selected。 */
  hoverWash: number
  selectedWash: number
  focusWash: number
  outlinedHoverWash: number
  iconButtonHoverWash: number
}

/** Studio · 浅色（既有配色，未改动）。 */
const studioLight: StudioTokens = {
  paper: '#f7f4ed',
  paper2: '#efebe2',
  paper3: '#e6e1d6',
  ink: '#1c2a22',
  ink2: '#4a5a50',
  rule: '#d8d2c6',
  accent: '#2f6b4f',
  accentLight: '#4a8a6a',
  accentDeep: '#24563f',
  accentInk: '#f7f4ed',
  success: '#2f6b4f',
  error: '#c24b3a',
  warning: '#b8922a',
  onAccent: '#f7f4ed',
  onWarning: '#1c2a22',
  secondaryMain: '#1c2a22',
  secondaryLight: '#3a4a40',
  secondaryDark: '#121a16',
  secondaryContrast: '#f7f4ed',
  tooltipSurface: '#3a4a40',
  tooltipText: '#f7f4ed',
  hoverWash: 0.04,
  selectedWash: 0.1,
  focusWash: 0.16,
  outlinedHoverWash: 0.04,
  iconButtonHoverWash: 0.08,
}

/**
 * Studio Night · 深色。
 *
 * 不是把浅色取反，而是同一套配色的夜间版本：底色是带一点绿味的暖炭而不是纯黑，
 * 正文用奶白（而不是纯白）压住刺眼感；品牌绿提到 L≈73% 后既能当作填充
 * （配深墨字，7.9:1）也能当作文字与图标（配卡片 6.1:1）。
 *
 * 表面比最初那版整体抬高过一档：卡片 L 25.2% → 29.5%、画布 20.5% → 24%，
 * 长时间阅读不压眼；发丝线与 tooltip 同步抬高，维持原本的层级关系。
 */
const studioNight: StudioTokens = {
  paper: '#282e2a',
  paper2: '#1b211d',
  paper3: '#111613',
  ink: '#ebeae2',
  ink2: '#a9aea5',
  rule: '#3c433d',
  accent: '#7cb899',
  accentLight: '#a9d3bc',
  accentDeep: '#91c9ac',
  accentInk: '#0e1913',
  success: '#7cb899',
  error: '#eb8372',
  warning: '#d4b365',
  onAccent: '#0e1913',
  onWarning: '#0e1913',
  secondaryMain: '#ebeae2',
  secondaryLight: '#f6f5ef',
  secondaryDark: '#c9cec6',
  secondaryContrast: '#111613',
  tooltipSurface: '#343a35',
  tooltipText: '#ebeae2',
  hoverWash: 0.06,
  selectedWash: 0.16,
  focusWash: 0.24,
  outlinedHoverWash: 0.1,
  iconButtonHoverWash: 0.14,
}

const fontBody =
  '"Geist", "Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

interface CreateAppThemeInput {
  mode: ResolvedColorMode
  tokens: StudioTokens
  palette: WorkspaceColorPalette
  elevation: WorkspaceElevation
}

const createAppTheme = ({ mode, tokens, palette, elevation }: CreateAppThemeInput) =>
  createTheme({
    spacing: 8,
    palette: {
      mode,
      primary: {
        main: tokens.accent,
        light: tokens.accentLight,
        dark: tokens.accentDeep,
        contrastText: tokens.accentInk,
      },
      secondary: {
        main: tokens.secondaryMain,
        light: tokens.secondaryLight,
        dark: tokens.secondaryDark,
        contrastText: tokens.secondaryContrast,
      },
      info: {
        main: tokens.accent,
        light: tokens.accentLight,
        dark: tokens.accentDeep,
        contrastText: tokens.accentInk,
      },
      success: {
        main: tokens.success,
        contrastText: tokens.onAccent,
      },
      error: {
        main: tokens.error,
        contrastText: tokens.onAccent,
      },
      warning: {
        main: tokens.warning,
        contrastText: tokens.onWarning,
      },
      background: {
        default: tokens.paper2,
        paper: tokens.paper,
      },
      text: {
        primary: tokens.ink,
        secondary: tokens.ink2,
      },
      divider: tokens.rule,
      action: {
        hover: alpha(tokens.ink, tokens.hoverWash),
        selected: alpha(tokens.accent, tokens.selectedWash),
        focus: alpha(tokens.accent, tokens.focusWash),
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      // CJK-first UI: Geist throughout so Latin + Chinese share one sans fallback path.
      // Instrument Serif stays available as --font-display for rare Latin accents only.
      fontFamily: fontBody,
      fontSize: 14,
      h5: {
        fontFamily: fontBody,
        fontSize: workspaceTypeRem.xl,
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.35,
        fontStyle: 'normal',
      },
      h6: {
        fontFamily: fontBody,
        fontSize: workspaceTypeRem.lg,
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.35,
        fontStyle: 'normal',
      },
      subtitle1: {
        fontSize: workspaceTypeRem.sm,
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.4,
      },
      subtitle2: {
        fontSize: workspaceTypeRem.sm,
        fontWeight: 600,
        letterSpacing: 0,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: workspaceTypeRem.sm,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: workspaceTypeRem.sm,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      caption: {
        fontSize: workspaceTypeRem.xs,
        letterSpacing: 0,
        lineHeight: 1.35,
      },
      button: {
        fontSize: workspaceTypeRem.sm,
        fontWeight: 600,
        letterSpacing: 0,
        textTransform: 'none',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            overflowX: 'clip',
          },
          body: {
            backgroundColor: tokens.paper2,
            color: tokens.ink2,
            overflowX: 'clip',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            // 深色下 MUI 默认用渐变叠出层级；Studio 走发丝线 + 平面，两层都不需要。
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: tokens.rule,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: 'none',
            transition: [
              `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
            ].join(', '),
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
            '&.MuiButton-colorPrimary': {
              backgroundColor: tokens.accent,
              color: tokens.accentInk,
              '&:hover': {
                backgroundColor: tokens.accentDeep,
              },
            },
          },
          outlined: {
            borderWidth: 1,
            borderColor: tokens.rule,
            '&:hover': {
              borderColor: tokens.accent,
              backgroundColor: alpha(tokens.accent, tokens.outlinedHoverWash),
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: [
              `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              `color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
            ].join(', '),
            '&:hover': {
              backgroundColor: alpha(tokens.accent, tokens.iconButtonHoverWash),
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: 'none',
            transition: [
              `border-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
              `background-color ${workspaceMotion.durationBaseMs}ms ${workspaceMotion.easingStandard}`,
            ].join(', '),
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: tokens.tooltipSurface,
            color: tokens.tooltipText,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            ...subtleScrollbarSx(theme),
          }),
        },
      },
    },
    workspacePalette: palette,
    workspaceElevation: elevation,
  })

export const lightTheme = createAppTheme({
  mode: 'light',
  tokens: studioLight,
  palette: workspaceColorPalette,
  elevation: workspaceElevation,
})

export const darkTheme = createAppTheme({
  mode: 'dark',
  tokens: studioNight,
  palette: workspaceDarkColorPalette,
  elevation: workspaceElevationDark,
})

/** 按解析后的颜色模式取主题。 */
export const resolveAppTheme = (mode: ResolvedColorMode) => (mode === 'dark' ? darkTheme : lightTheme)
