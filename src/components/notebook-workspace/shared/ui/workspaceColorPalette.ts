/**
 * Notebook workspace semantic color tokens.
 * Hallmark · genre: editorial · theme: Studio · design-system: design.md
 */
export const workspaceColorPalette = {
  overlay: {
    backdropAlpha: 0.34,
  },
  scrollbar: {
    hoverThumbRgb: '47, 107, 79',
    hoverThumbOpacity: 0.28,
  },
  flowLoading: {
    rgbColor: '47, 107, 79',
    /** Stronger peak so the sweep is obvious on cream paper. */
    peakOpacity: 0.3,
  },
  source: {
    /** Fallback when a type has no entry in `sourceType`. */
    typeIcon: 'text.secondary',
  },
  /**
   * Per source-format icon tones (Studio: outlined glyphs + quiet chroma on cream).
   */
  sourceType: {
    url: {
      accent: '#3d5a80',
      border: '#b7c4d4',
      icon: '#3d5a80',
      surface: 'rgba(61, 90, 128, 0.08)',
    },
    text: {
      accent: '#5a6b48',
      border: '#c5ccb8',
      icon: '#5a6b48',
      surface: 'rgba(90, 107, 72, 0.08)',
    },
    pdf: {
      accent: '#a65d48',
      border: '#e0b8ae',
      icon: '#a65d48',
      surface: 'rgba(166, 93, 72, 0.08)',
    },
    epub: {
      accent: '#2f6b4f',
      border: '#9fc0ae',
      icon: '#2f6b4f',
      surface: 'rgba(47, 107, 79, 0.08)',
    },
    docx: {
      accent: '#3f5f6b',
      border: '#b4c4cb',
      icon: '#3f5f6b',
      surface: 'rgba(63, 95, 107, 0.08)',
    },
    xlsx: {
      accent: '#2f6b6b',
      border: '#a8c4c4',
      icon: '#2f6b6b',
      surface: 'rgba(47, 107, 107, 0.08)',
    },
    pptx: {
      accent: '#9a7b2f',
      border: '#d4c49a',
      icon: '#9a7b2f',
      surface: 'rgba(154, 123, 47, 0.08)',
    },
    txt: {
      accent: '#4a5a50',
      border: '#c9c2b4',
      icon: '#4a5a50',
      surface: 'rgba(74, 90, 80, 0.06)',
    },
    markdown: {
      accent: '#3d5a80',
      border: '#b7c4d4',
      icon: '#3d5a80',
      surface: 'rgba(61, 90, 128, 0.08)',
    },
    csv: {
      accent: '#2f6b6b',
      border: '#a8c4c4',
      icon: '#2f6b6b',
      surface: 'rgba(47, 107, 107, 0.08)',
    },
    image: {
      accent: '#6b4f8a',
      border: '#c4b4d4',
      icon: '#6b4f8a',
      surface: 'rgba(107, 79, 138, 0.08)',
    },
    default: {
      accent: '#4a5a50',
      border: '#c9c2b4',
      icon: '#4a5a50',
      surface: 'rgba(74, 90, 80, 0.06)',
    },
  },
  /**
   * Per artifact / tool-type tones. Distinct but cream-paper quiet (Studio, not Hum).
   */
  artifactKind: {
    mindmap: {
      accent: '#2f6b4f',
      border: '#9fc0ae',
      icon: '#2f6b4f',
      surface: 'rgba(47, 107, 79, 0.08)',
    },
    report: {
      accent: '#5a6b48',
      border: '#c5ccb8',
      icon: '#5a6b48',
      surface: 'rgba(90, 107, 72, 0.08)',
    },
    info_graphic: {
      accent: '#2f6b6b',
      border: '#a8c4c4',
      icon: '#2f6b6b',
      surface: 'rgba(47, 107, 107, 0.08)',
    },
    audio_overview: {
      accent: '#3d5a80',
      border: '#b7c4d4',
      icon: '#3d5a80',
      surface: 'rgba(61, 90, 128, 0.08)',
    },
    video_overview: {
      accent: '#3d5a80',
      border: '#b7c4d4',
      icon: '#3d5a80',
      surface: 'rgba(61, 90, 128, 0.08)',
    },
    flashcard: {
      accent: '#9a7b2f',
      border: '#d4c49a',
      icon: '#9a7b2f',
      surface: 'rgba(154, 123, 47, 0.08)',
    },
    quiz: {
      accent: '#a65d48',
      border: '#e0b8ae',
      icon: '#a65d48',
      surface: 'rgba(166, 93, 72, 0.08)',
    },
    data_table: {
      accent: '#3f5f6b',
      border: '#b4c4cb',
      icon: '#3f5f6b',
      surface: 'rgba(63, 95, 107, 0.08)',
    },
    note: {
      accent: '#6a7a68',
      border: '#c5ccb8',
      icon: '#6a7a68',
      surface: 'rgba(106, 122, 104, 0.08)',
    },
    slides: {
      accent: '#8a5a3c',
      border: '#d4b8a8',
      icon: '#8a5a3c',
      surface: 'rgba(138, 90, 60, 0.08)',
    },
    'video-overview': {
      accent: '#3d5a80',
      border: '#b7c4d4',
      icon: '#3d5a80',
      surface: 'rgba(61, 90, 128, 0.08)',
    },
    'slide-deck': {
      accent: '#8a5a3c',
      border: '#d4b8a8',
      icon: '#8a5a3c',
      surface: 'rgba(138, 90, 60, 0.08)',
    },
    default: {
      accent: '#2f6b4f',
      border: '#9fc0ae',
      icon: '#2f6b4f',
      surface: 'rgba(47, 107, 79, 0.06)',
    },
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
        accent: '#6a756c',
        border: '#c9c2b4',
        icon: '#5a655c',
        surface: 'rgba(74, 90, 80, 0.06)',
      },
      polling: {
        accent: '#2f6b4f',
        border: '#9fc0ae',
        icon: '#2f6b4f',
        surface: 'rgba(47, 107, 79, 0.08)',
      },
      succeeded: {
        accent: '#2f6b4f',
        border: '#9fc0ae',
        icon: '#2f6b4f',
        surface: 'rgba(47, 107, 79, 0.1)',
      },
      failed: {
        accent: '#c24b3a',
        border: '#e0a59c',
        icon: '#c24b3a',
        surface: 'rgba(194, 75, 58, 0.08)',
      },
      cancelled: {
        accent: '#8a9188',
        border: '#d8d2c6',
        icon: '#8a9188',
        surface: 'rgba(138, 145, 136, 0.06)',
      },
    },
    dark: {
      queued: {
        accent: '#a8b2aa',
        border: '#4a554c',
        icon: '#a8b2aa',
        surface: 'rgba(168, 178, 170, 0.12)',
      },
      polling: {
        accent: '#7eb896',
        border: '#3d6a54',
        icon: '#7eb896',
        surface: 'rgba(126, 184, 150, 0.14)',
      },
      succeeded: {
        accent: '#7eb896',
        border: '#3d6a54',
        icon: '#7eb896',
        surface: 'rgba(126, 184, 150, 0.14)',
      },
      failed: {
        accent: '#e08a7c',
        border: '#7a4038',
        icon: '#e08a7c',
        surface: 'rgba(224, 138, 124, 0.14)',
      },
      cancelled: {
        accent: '#b0b8b2',
        border: '#4a554c',
        icon: '#b0b8b2',
        surface: 'rgba(176, 184, 178, 0.12)',
      },
    },
  },
  mindmap: {
    light: {
      surface: '#f7f4ed',
      surfaceBorder: 'rgba(28, 42, 34, 0.16)',
      nodeBorder: '#c9c2b4',
      nodeBackground: '#f7f4ed',
      nodeHighlightBorder: '#2f6b4f',
      nodeHighlightBackground: '#e4efe8',
      edge: '#a8b0a6',
      edgeHighlight: '#2f6b4f',
      textPrimary: '#1c2a22',
      level0Border: '#2f6b4f',
      level0Background: '#d8ebe0',
      level0Text: '#1c2a22',
      level1Border: '#4a8a6a',
      level1Background: '#eef5f0',
      level1Text: '#1c2a22',
      toolbarText: '#1c2a22',
      toolbarBackground: 'rgba(247, 244, 237, 0.94)',
      toolbarBorder: 'rgba(28, 42, 34, 0.14)',
      toolbarHover: '#efebe2',
    },
    dark: {
      surface: '#1c2a22',
      surfaceBorder: 'rgba(126, 184, 150, 0.28)',
      nodeBorder: '#3d4a42',
      nodeBackground: '#24332a',
      nodeHighlightBorder: '#7eb896',
      nodeHighlightBackground: '#2a4034',
      edge: '#5a655c',
      edgeHighlight: '#7eb896',
      textPrimary: '#f7f4ed',
      level0Border: '#7eb896',
      level0Background: '#2a4034',
      level0Text: '#f7f4ed',
      level1Border: '#4a8a6a',
      level1Background: '#223028',
      level1Text: '#e8efe9',
      toolbarText: 'rgba(247, 244, 237, 0.92)',
      toolbarBackground: 'rgba(28, 42, 34, 0.9)',
      toolbarBorder: 'rgba(126, 184, 150, 0.28)',
      toolbarHover: 'rgba(36, 51, 42, 0.94)',
    },
  },
} as const

export type WorkspaceColorPalette = typeof workspaceColorPalette
