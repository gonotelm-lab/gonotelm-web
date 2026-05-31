import type { ReactNode, RefObject } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { Box, Divider, IconButton, Stack, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { panelTitleSx, panelTitleVariant } from './panelStyles'

const panelSubpageTransition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'

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

export function PanelSubpageLayout({
  primaryContent,
  subpage,
  subpageBodySx,
  subpageBodyRef,
}: PanelSubpageLayoutProps) {
  const subpageOpen = Boolean(subpage)

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          width: '200%',
          height: '100%',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          transform: subpageOpen ? 'translateX(-50%)' : 'translateX(0)',
          transition: panelSubpageTransition,
        }}
      >
        <Box sx={{ minWidth: 0, minHeight: 0, pointerEvents: subpageOpen ? 'none' : 'auto' }}>
          {primaryContent}
        </Box>
        <Box sx={{ minWidth: 0, minHeight: 0, pointerEvents: subpageOpen ? 'auto' : 'none' }}>
          {subpage ? (
            <Stack sx={{ height: '100%', minHeight: 0 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
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
              <Divider sx={{ my: 1.25 }} />
              <Box
                ref={subpageBodyRef}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  ...subpageBodySx,
                }}
              >
                {subpage.content}
              </Box>
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}
