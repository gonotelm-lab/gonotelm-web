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

/**
 * Keep primary pane mounted across open/close so list scroll position survives.
 * Use two absolute panes (no 200% track) to avoid short-viewport layout glitches.
 */
export function PanelSubpageLayout({
  primaryContent,
  subpage,
  subpageBodySx,
  subpageBodyRef,
}: PanelSubpageLayoutProps) {
  const subpageOpen = Boolean(subpage)

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
        aria-hidden={subpageOpen}
        sx={{
          position: 'absolute',
          inset: 0,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: subpageOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: panelSubpageTransition,
          pointerEvents: subpageOpen ? 'none' : 'auto',
        }}
      >
        {primaryContent}
      </Box>

      <Box
        aria-hidden={!subpageOpen}
        sx={{
          position: 'absolute',
          inset: 0,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          transform: subpageOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: panelSubpageTransition,
          pointerEvents: subpageOpen ? 'auto' : 'none',
        }}
      >
        {subpage ? (
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
        ) : null}
      </Box>
    </Box>
  )
}
