import { Box } from '@mui/material'
import { FAVICON_HREF_BY_MODE } from '../../app/colorMode'
import { useResolvedColorMode } from '../../app/colorModeStore'

interface BrandMarkProps {
  /** 标记边长（px）。顶栏 / 首页行内 26，认证页领头处 48。 */
  size?: number
}

/**
 * GoNoteLM 的刻槽标记。图形只在 `public/favicon*.svg` 里定义一次，这里不复制
 * 几何，只负责「用哪张、以多大、放在哪一行」。
 *
 * 两版图形是同一条路径的不同填色：浅色界面用 forest 绿，深色界面用奶白
 * （绿色标记压在深底上对比只有 2.5:1，读不出来）。与标签页图标共用一份映射。
 *
 * 纯品牌装饰：相邻的字标或页面标题已经承载产品名，图本身不进读屏、也不进焦点
 * 顺序，所以固定 `alt="" aria-hidden`。需要「点标记回首页」时，由外层包一层链接
 * 或按钮来补语义和键盘可达性。
 */
export function BrandMark({ size = 26 }: BrandMarkProps) {
  const resolvedMode = useResolvedColorMode()

  return (
    <Box
      component="img"
      src={FAVICON_HREF_BY_MODE[resolvedMode]}
      alt=""
      aria-hidden
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    />
  )
}
