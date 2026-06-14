/**
 * Notebook workspace semantic color tokens.
 * Keep component colors centralized here so multi-theme switching only needs
 * token remapping instead of touching scattered component styles.
 */
export const workspaceColorPalette = {
  overlay: {
    backdropAlpha: 0.36,
  },
  scrollbar: {
    hoverThumbRgb: '21, 42, 74',
    hoverThumbOpacity: 0.18,
  },
  flowLoading: {
    rgbColor: '21, 42, 74',
    peakOpacity: 0.14,
  },
  source: {
    typeIcon: 'text.secondary',
  },
  citation: {
    summaryType: 'primary.main',
    originalType: 'text.secondary',
  },
  status: {
    success: 'success.main',
    warning: 'warning.main',
    error: 'error.main',
    info: 'info.main',
  },
  artifactList: {
    light: {
      queued: {
        accent: '#6b8098',
        border: '#b2c0cf',
        icon: '#5e748d',
        surface: 'rgba(94, 116, 141, 0.06)',
      },
      polling: {
        accent: '#27406a',
        border: '#90a3be',
        icon: '#27406a',
        surface: 'rgba(39, 64, 106, 0.08)',
      },
      succeeded: {
        accent: '#3f7268',
        border: '#9ab8b2',
        icon: '#3f7268',
        surface: 'rgba(63, 114, 104, 0.08)',
      },
      failed: {
        accent: '#875866',
        border: '#c0a2ad',
        icon: '#875866',
        surface: 'rgba(135, 88, 102, 0.08)',
      },
      cancelled: {
        accent: '#95a4b3',
        border: '#d2dae2',
        icon: '#95a4b3',
        surface: 'rgba(149, 164, 179, 0.06)',
      },
    },
    dark: {
      queued: {
        accent: '#8ea2b9',
        border: '#63788e',
        icon: '#8ea2b9',
        surface: 'rgba(142, 162, 185, 0.12)',
      },
      polling: {
        accent: '#9db2cf',
        border: '#6a84a3',
        icon: '#9db2cf',
        surface: 'rgba(157, 178, 207, 0.14)',
      },
      succeeded: {
        accent: '#8bc0b3',
        border: '#5f8f84',
        icon: '#8bc0b3',
        surface: 'rgba(139, 192, 179, 0.14)',
      },
      failed: {
        accent: '#d3a9b4',
        border: '#87616b',
        icon: '#d3a9b4',
        surface: 'rgba(211, 169, 180, 0.14)',
      },
      cancelled: {
        accent: '#a9b6c4',
        border: '#6d7d8d',
        icon: '#a9b6c4',
        surface: 'rgba(169, 182, 196, 0.12)',
      },
    },
  },
  mindmap: {
    light: {
      surface: '#f7f9fb',
      surfaceBorder: 'rgba(21, 42, 74, 0.24)',
      nodeBorder: '#b7c3d1',
      nodeBackground: '#f7f9fb',
      nodeHighlightBorder: '#152a4a',
      nodeHighlightBackground: '#e9eef4',
      edge: '#9caec2',
      edgeHighlight: '#152a4a',
      textPrimary: '#0a1f3d',
      level0Border: '#152a4a',
      level0Background: '#dfe7f0',
      level0Text: '#0a1f3d',
      level1Border: '#27406a',
      level1Background: '#e9eef4',
      level1Text: '#0a1f3d',
      toolbarText: '#0a1f3d',
      toolbarBackground: 'rgba(247, 249, 251, 0.92)',
      toolbarBorder: 'rgba(21, 42, 74, 0.22)',
      toolbarHover: '#f1f3f5',
    },
    dark: {
      surface: '#0f223f',
      surfaceBorder: 'rgba(159, 181, 211, 0.34)',
      nodeBorder: '#5c7294',
      nodeBackground: '#152a4a',
      nodeHighlightBorder: '#9db2cf',
      nodeHighlightBackground: '#1e3a63',
      edge: '#7087a8',
      edgeHighlight: '#9db2cf',
      textPrimary: '#f1f3f5',
      level0Border: '#b4c5db',
      level0Background: '#24456f',
      level0Text: '#f1f3f5',
      level1Border: '#94adcc',
      level1Background: '#1c395f',
      level1Text: '#e8eef5',
      toolbarText: 'rgba(241, 245, 249, 0.92)',
      toolbarBackground: 'rgba(15, 34, 63, 0.88)',
      toolbarBorder: 'rgba(159, 181, 211, 0.38)',
      toolbarHover: 'rgba(21, 42, 74, 0.94)',
    },
  },
} as const

export type WorkspaceColorPalette = typeof workspaceColorPalette

