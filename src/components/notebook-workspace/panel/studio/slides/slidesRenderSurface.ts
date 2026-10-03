import type { SxProps, Theme } from '@mui/material/styles'

/**
 * 阻断站点主题字体（Geist 等）渗入 pptx 渲染树，
 * 避免未显式设 font 的节点继承后改变行距/换行。
 */
export const slidesRenderSurfaceSx = {
  fontFamily: 'Arial, "Microsoft YaHei", "微软雅黑", "Noto Sans SC", sans-serif',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  wordSpacing: 'normal',
  fontSynthesis: 'none',
  textRendering: 'geometricPrecision',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  // 渲染树多为绝对定位 + 明确宽高；避免 flex 祖先意外拉伸子项
  '& *': {
    fontSynthesis: 'none',
  },
} satisfies SxProps<Theme>
