import type { ReactNode, RefObject } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { Box, Divider, IconButton, Stack, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { workspaceSpace } from './layoutTokens'
import { workspaceTransitionPresets } from './motionTokens'
import { panelTitleSx, panelTitleVariant } from './panelStyles'
import { subtleScrollbarSx } from './scrollbar'

const panelSubpageTransition = workspaceTransitionPresets.panelTransform

export interface PanelSubpageConfig {
  parentTitle: string
  title: string
  content: ReactNode
  onClose: () => void
  closeAriaLabel?: string
}

interface PanelSubpageLayoutProps {
  primaryContent: ReactNode
  subpage: PanelSubpageConfig | null
  subpageBodySx?: SxProps<Theme>
  subpageBodyRef?: RefObject<HTMLDivElement | null>
}

const paneShellSx = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
} as const

export function PanelSubpageLayout({
  primaryContent,
  subpage,
  subpageBodySx,
  subpageBodyRef,
}: PanelSubpageLayoutProps) {
  const subpageOpen = Boolean(subpage)

  // 无子页时不要挂 200%/transform 轨道：矮视口（如 F12）下该轨道会把主列表行对齐搞坏
  if (!subpageOpen) {
    return <Box sx={paneShellSx}>{primaryContent}</Box>
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '200%',
          display: 'flex',
          transform: 'translateX(-50%)',
          transition: panelSubpageTransition,
        }}
      >
        <Box
          sx={{
            width: '50%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'none',
          }}
        >
          {primaryContent}
        </Box>
        <Box
          sx={{
            width: '50%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          <Stack sx={{ height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Typography
                variant={panelTitleVariant}
                sx={{
                  ...panelTitleSx,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {subpage.parentTitle} {'>'} {subpage.title}
              </Typography>
              <IconButton
                size="small"
                color="default"
                aria-label={subpage.closeAriaLabel ?? '返回上一级'}
                onClick={subpage.onClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Divider sx={{ my: workspaceSpace.md, flexShrink: 0 }} />
            <Box
              ref={subpageBodyRef}
              sx={[
                (theme) => ({
                  flex: 1,
                  width: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  overflowY: 'auto',
                  ...subtleScrollbarSx(theme),
                }),
                ...(subpageBodySx
                  ? Array.isArray(subpageBodySx)
                    ? subpageBodySx
                    : [subpageBodySx]
                  : []),
              ]}
            >
              {subpage.content}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
