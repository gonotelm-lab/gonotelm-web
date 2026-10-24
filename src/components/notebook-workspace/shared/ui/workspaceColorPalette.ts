/**
 * Notebook workspace semantic color tokens.
 * Hallmark · genre: editorial · theme: Studio (light) / Studio Night (dark) · design-system: design.md
 *
 * 两套色板共享同一份结构（`WorkspaceColorPalette`），由 `app/theme.ts` 按当前模式挂到
 * `theme.workspacePalette` 上，因此组件里 `sx={(theme) => ...}` 不需要写模式分支。
 *
 * 深色（Studio Night）沿用浅色的色相与色度，只把明度翻转：
 * 同色相下把 accent 提到 L≈73%、border 压到 L≈44%，各类标记因此在深色卡片上
 * 落在同一个对比度带里（≈6.5–7:1），既统一又都读得清。
 */
import type { SourceIconType } from '@/components/notebook-workspace/panel/sources/types/sourceTypes'
import type { StudioSemanticTone, StudioToolToneKey } from './studioSemanticTones'

export interface WorkspaceMindmapTone {
  surface: string
  surfaceBorder: string
  nodeBorder: string
  nodeBackground: string
  nodeHighlightBorder: string
  nodeHighlightBackground: string
  edge: string
  edgeHighlight: string
  textPrimary: string
  level0Border: string
  level0Background: string
  level0Text: string
  level1Border: string
  level1Background: string
  level1Text: string
  toolbarText: string
  toolbarBackground: string
  toolbarBorder: string
  toolbarHover: string
}

export interface WorkspaceArtifactListTones {
  queued: StudioSemanticTone
  polling: StudioSemanticTone
  succeeded: StudioSemanticTone
  failed: StudioSemanticTone
  cancelled: StudioSemanticTone
}

export interface WorkspaceColorPalette {
  overlay: {
    /** 覆盖层遮罩的基色；深色下换成近黑，避免整体染上品牌绿。 */
    backdropColor: string
    backdropAlpha: number
  }
  scrollbar: {
    hoverThumbRgb: string
    hoverThumbOpacity: number
  }
  flowLoading: {
    rgbColor: string
    /** 深色底需要更强的峰值才看得出扫光。 */
    peakOpacity: number
  }
  source: {
    /** Fallback when a type has no entry in `sourceType`. */
    typeIcon: string
  }
  /** Per source-format icon tones (outlined glyphs + quiet chroma). */
  sourceType: Record<SourceIconType | 'default', StudioSemanticTone>
  /** Per artifact / tool-type tones. */
  artifactKind: Record<StudioToolToneKey, StudioSemanticTone>
  status: {
    success: string
    warning: string
    error: string
    info: string
  }
  /** 任务状态色的成对明暗变体：列表项自己按 `palette.mode` 取用。 */
  artifactList: {
    light: WorkspaceArtifactListTones
    dark: WorkspaceArtifactListTones
  }
  /** 思维导图是 canvas 绘制，拿不到 MUI 的 CSS，必须成对给出明暗两套。 */
  mindmap: {
    light: WorkspaceMindmapTone
    dark: WorkspaceMindmapTone
  }
  code: {
    /** 代码块底色：整站唯一的冷调墨洗，与暖色纸面区分。 */
    surface: string
  }
}

/** Studio · 浅色（既有配色，未改动）。 */
export const workspaceColorPalette: WorkspaceColorPalette = {
  overlay: {
    backdropColor: '#24563f',
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
        accent: '#a9aea5',
        border: '#4a514b',
        icon: '#a9aea5',
        surface: 'rgba(169, 174, 165, 0.12)',
      },
      polling: {
        accent: '#7cb899',
        border: '#3a5a4a',
        icon: '#7cb899',
        surface: 'rgba(124, 184, 153, 0.14)',
      },
      succeeded: {
        accent: '#7cb899',
        border: '#3a5a4a',
        icon: '#7cb899',
        surface: 'rgba(124, 184, 153, 0.16)',
      },
      failed: {
        accent: '#f47d69',
        border: '#7a4038',
        icon: '#f47d69',
        surface: 'rgba(244, 125, 105, 0.14)',
      },
      cancelled: {
        // 表面提亮后原值只剩 4.4:1，抬一档保持「已取消」比 queued 更暗的层级。
        accent: '#99a099',
        border: '#4f564f',
        icon: '#99a099',
        surface: 'rgba(153, 160, 153, 0.12)',
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
      surface: '#1b211d',
      surfaceBorder: 'rgba(124, 184, 153, 0.26)',
      nodeBorder: '#434a44',
      nodeBackground: '#282e2a',
      nodeHighlightBorder: '#7cb899',
      nodeHighlightBackground: '#1e3026',
      edge: '#565d57',
      edgeHighlight: '#7cb899',
      textPrimary: '#ebeae2',
      level0Border: '#7cb899',
      level0Background: '#172d22',
      level0Text: '#ebeae2',
      level1Border: '#649e80',
      level1Background: '#18231d',
      level1Text: '#d9e0d8',
      toolbarText: 'rgba(235, 234, 226, 0.92)',
      toolbarBackground: 'rgba(27, 33, 29, 0.92)',
      toolbarBorder: 'rgba(124, 184, 153, 0.28)',
      toolbarHover: 'rgba(42, 48, 43, 0.94)',
    },
  },
  code: {
    surface: '#f0efe8',
  },
}

/** Studio Night · 深色：同色相、同色度，明度翻转。 */
export const workspaceDarkColorPalette: WorkspaceColorPalette = {
  overlay: {
    backdropColor: '#050806',
    backdropAlpha: 0.62,
  },
  scrollbar: {
    hoverThumbRgb: '124, 184, 153',
    hoverThumbOpacity: 0.3,
  },
  flowLoading: {
    rgbColor: '124, 184, 153',
    peakOpacity: 0.3,
  },
  source: {
    typeIcon: 'text.secondary',
  },
  sourceType: {
    url: {
      accent: '#8dacd4',
      border: '#40546e',
      icon: '#8dacd4',
      surface: 'rgba(141, 172, 212, 0.14)',
    },
    text: {
      accent: '#9fb08d',
      border: '#4c5740',
      icon: '#9fb08d',
      surface: 'rgba(159, 176, 141, 0.14)',
    },
    pdf: {
      accent: '#de947e',
      border: '#744436',
      icon: '#de947e',
      surface: 'rgba(222, 148, 126, 0.14)',
    },
    epub: {
      accent: '#7fb89a',
      border: '#365c49',
      icon: '#7fb89a',
      surface: 'rgba(127, 184, 154, 0.14)',
    },
    docx: {
      accent: '#8fafbc',
      border: '#41565f',
      icon: '#8fafbc',
      surface: 'rgba(143, 175, 188, 0.14)',
    },
    xlsx: {
      accent: '#7db5b5',
      border: '#345a5a',
      icon: '#7db5b5',
      surface: 'rgba(125, 181, 181, 0.14)',
    },
    pptx: {
      accent: '#c4a560',
      border: '#645020',
      icon: '#c4a560',
      surface: 'rgba(196, 165, 96, 0.14)',
    },
    txt: {
      accent: '#9daea3',
      border: '#4b564f',
      icon: '#9daea3',
      surface: 'rgba(157, 174, 163, 0.14)',
    },
    markdown: {
      accent: '#8dacd4',
      border: '#40546e',
      icon: '#8dacd4',
      surface: 'rgba(141, 172, 212, 0.14)',
    },
    csv: {
      accent: '#7db5b5',
      border: '#345a5a',
      icon: '#7db5b5',
      surface: 'rgba(125, 181, 181, 0.14)',
    },
    image: {
      accent: '#b79bd8',
      border: '#5b4971',
      icon: '#b79bd8',
      surface: 'rgba(183, 155, 216, 0.14)',
    },
    default: {
      accent: '#9daea3',
      border: '#4b564f',
      icon: '#9daea3',
      surface: 'rgba(157, 174, 163, 0.14)',
    },
  },
  artifactKind: {
    mindmap: {
      accent: '#7fb89a',
      border: '#365c49',
      icon: '#7fb89a',
      surface: 'rgba(127, 184, 154, 0.14)',
    },
    report: {
      accent: '#9fb08d',
      border: '#4c5740',
      icon: '#9fb08d',
      surface: 'rgba(159, 176, 141, 0.14)',
    },
    info_graphic: {
      accent: '#7db5b5',
      border: '#345a5a',
      icon: '#7db5b5',
      surface: 'rgba(125, 181, 181, 0.14)',
    },
    audio_overview: {
      accent: '#8dacd4',
      border: '#40546e',
      icon: '#8dacd4',
      surface: 'rgba(141, 172, 212, 0.14)',
    },
    video_overview: {
      accent: '#8dacd4',
      border: '#40546e',
      icon: '#8dacd4',
      surface: 'rgba(141, 172, 212, 0.14)',
    },
    flashcard: {
      accent: '#c4a560',
      border: '#645020',
      icon: '#c4a560',
      surface: 'rgba(196, 165, 96, 0.14)',
    },
    quiz: {
      accent: '#de947e',
      border: '#744436',
      icon: '#de947e',
      surface: 'rgba(222, 148, 126, 0.14)',
    },
    data_table: {
      accent: '#8fafbc',
      border: '#41565f',
      icon: '#8fafbc',
      surface: 'rgba(143, 175, 188, 0.14)',
    },
    note: {
      accent: '#9eaf9c',
      border: '#4b564a',
      icon: '#9eaf9c',
      surface: 'rgba(158, 175, 156, 0.14)',
    },
    slides: {
      accent: '#cf9d7f',
      border: '#6b4a36',
      icon: '#cf9d7f',
      surface: 'rgba(207, 157, 127, 0.14)',
    },
    'video-overview': {
      accent: '#8dacd4',
      border: '#40546e',
      icon: '#8dacd4',
      surface: 'rgba(141, 172, 212, 0.14)',
    },
    'slide-deck': {
      accent: '#cf9d7f',
      border: '#6b4a36',
      icon: '#cf9d7f',
      surface: 'rgba(207, 157, 127, 0.14)',
    },
    default: {
      accent: '#7fb89a',
      border: '#365c49',
      icon: '#7fb89a',
      surface: 'rgba(127, 184, 154, 0.14)',
    },
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
        accent: '#a9aea5',
        border: '#4a514b',
        icon: '#a9aea5',
        surface: 'rgba(169, 174, 165, 0.12)',
      },
      polling: {
        accent: '#7cb899',
        border: '#3a5a4a',
        icon: '#7cb899',
        surface: 'rgba(124, 184, 153, 0.14)',
      },
      succeeded: {
        accent: '#7cb899',
        border: '#3a5a4a',
        icon: '#7cb899',
        surface: 'rgba(124, 184, 153, 0.16)',
      },
      failed: {
        accent: '#f47d69',
        border: '#7a4038',
        icon: '#f47d69',
        surface: 'rgba(244, 125, 105, 0.14)',
      },
      cancelled: {
        // 表面提亮后原值只剩 4.4:1，抬一档保持「已取消」比 queued 更暗的层级。
        accent: '#99a099',
        border: '#4f564f',
        icon: '#99a099',
        surface: 'rgba(153, 160, 153, 0.12)',
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
      surface: '#1b211d',
      surfaceBorder: 'rgba(124, 184, 153, 0.26)',
      nodeBorder: '#434a44',
      nodeBackground: '#282e2a',
      nodeHighlightBorder: '#7cb899',
      nodeHighlightBackground: '#1e3026',
      edge: '#565d57',
      edgeHighlight: '#7cb899',
      textPrimary: '#ebeae2',
      level0Border: '#7cb899',
      level0Background: '#172d22',
      level0Text: '#ebeae2',
      level1Border: '#649e80',
      level1Background: '#18231d',
      level1Text: '#d9e0d8',
      toolbarText: 'rgba(235, 234, 226, 0.92)',
      toolbarBackground: 'rgba(27, 33, 29, 0.92)',
      toolbarBorder: 'rgba(124, 184, 153, 0.28)',
      toolbarHover: 'rgba(42, 48, 43, 0.94)',
    },
  },
  code: {
    surface: '#172023',
  },
}
