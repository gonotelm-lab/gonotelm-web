import { memo } from 'react'
import { Typography } from '@mui/material'
import { workspaceSpace } from '../../shared/ui/layoutTokens'

interface ChatTimeSeparatorProps {
  label: string
}

/**
 * 微信式居中时间标签：插在 user 气泡上方，不抢内容层级。
 */
export const ChatTimeSeparator = memo(function ChatTimeSeparator({
  label,
}: ChatTimeSeparatorProps) {
  return (
    <Typography
      component="div"
      role="separator"
      aria-label={label}
      variant="caption"
      sx={{
        display: 'block',
        textAlign: 'center',
        color: 'text.secondary',
        py: workspaceSpace.sm,
        userSelect: 'none',
      }}
    >
      {label}
    </Typography>
  )
})
