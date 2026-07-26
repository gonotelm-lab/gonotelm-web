import { alpha, createTheme } from '@mui/material/styles'
import type { WorkspaceColorPalette } from '@/components/notebook-workspace/shared/ui/workspaceColorPalette'
import { workspaceColorPalette } from '@/components/notebook-workspace/shared/ui/workspaceColorPalette'
import { workspaceTypeRem } from '@/components/notebook-workspace/shared/ui/typeTokens'

declare module '@mui/material/styles' {
  interface Theme {
    workspacePalette: WorkspaceColorPalette
  }

  interface ThemeOptions {
    workspacePalette?: WorkspaceColorPalette
  }
}

export const appTheme = createTheme({
  spacing: 8,
  palette: {
    mode: 'light',
    primary: {
      main: '#152a4a',
      light: '#27406a',
      dark: '#0f223f',
    },
    secondary: {
      main: '#0a1f3d',
    },
    info: {
      main: '#27406a',
      light: '#3e5780',
      dark: '#152a4a',
      contrastText: '#f7f9fb',
    },
    background: {
      default: '#f1f3f5',
      paper: '#f7f9fb',
    },
    text: {
      primary: '#0a1f3d',
      secondary: '#152a4a',
    },
    divider: '#dde4ea',
    action: {
      hover: alpha('#0a1f3d', 0.04),
      selected: alpha('#0a1f3d', 0.08),
      focus: alpha('#0a1f3d', 0.16),
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      '"Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    fontSize: 14,
    h5: {
      fontSize: workspaceTypeRem.xl,
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1.35,
    },
    h6: {
      fontSize: workspaceTypeRem.lg,
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1.35,
    },
    subtitle1: {
      fontSize: workspaceTypeRem.sm,
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1.4,
    },
    subtitle2: {
      fontSize: workspaceTypeRem.sm,
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: workspaceTypeRem.sm,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: workspaceTypeRem.sm,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: workspaceTypeRem.xs,
      lineHeight: 1.35,
    },
    button: {
      fontSize: workspaceTypeRem.sm,
      fontWeight: 500,
      letterSpacing: 0,
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f1f3f5',
          color: '#0a1f3d',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: '#dde4ea',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition:
            'background-color 180ms cubic-bezier(0.2, 0, 0, 1), border-color 180ms cubic-bezier(0.2, 0, 0, 1), color 180ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition:
            'background-color 180ms cubic-bezier(0.2, 0, 0, 1), color 180ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
  workspacePalette: workspaceColorPalette,
})
