import { useState } from 'react'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Box, ButtonBase, Dialog, Divider, IconButton, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { AvatarCanvasFactory, AvatarImageFactory } from '../../lib/avatarImage'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../notebook-workspace/shared/ui/motionTokens'
import { subtleScrollbarSx } from '../notebook-workspace/shared/ui/scrollbar'
import { workspaceIconSize, workspaceType } from '../notebook-workspace/shared/ui/typeTokens'
import { LanguageSettingsSection } from './LanguageSettingsSection'
import { ProfileSettingsSection } from './ProfileSettingsSection'
import { SETTINGS_SECTIONS, type SettingsSectionId } from './settingsSections'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  /** 画布工厂接缝，仅用于在没有 DOM 的测试环境注入替身。 */
  createCanvas?: AvatarCanvasFactory
  createImage?: AvatarImageFactory
}

/**
 * App settings dialog: a fixed left navigation rail and a scrollable right pane.
 * Add a section by extending `SETTINGS_SECTIONS` and the content switch below.
 */
export function SettingsDialog({ open, onClose, createCanvas, createImage }: SettingsDialogProps) {
  const { t } = useTranslation(['settings', 'common'])
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: workspaceDialogLayout.paperRadius,
            height: 'min(560px, calc(100vh - 64px))',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: workspaceSpace.lg,
          py: workspaceSpace.md,
        }}
      >
        <Typography variant="h6" component="h2">
          {t('settings:title')}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={t('common:action.close')}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Divider />

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box
          component="nav"
          aria-label={t('settings:nav.aria')}
          sx={(theme) => ({
            width: 168,
            flexShrink: 0,
            p: workspaceSpace.sm,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
            ...subtleScrollbarSx(theme),
          })}
        >
          <Stack component="ul" spacing={workspaceSpace.xxs} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {SETTINGS_SECTIONS.map(({ id, labelKey, Icon }) => {
              const selected = id === activeSection
              return (
                <Box component="li" key={id} sx={{ listStyle: 'none' }}>
                  <ButtonBase
                    data-testid={`settings-nav-${id}`}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => setActiveSection(id)}
                    sx={(theme) => ({
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      gap: workspaceSpace.md,
                      px: workspaceSpace.md,
                      py: workspaceSpace.sm,
                      borderRadius: workspaceRadius.sm,
                      color: selected ? 'primary.main' : 'text.secondary',
                      backgroundColor: selected
                        ? alpha(theme.palette.primary.main, 0.1)
                        : 'transparent',
                      fontSize: workspaceType.sm,
                      fontWeight: selected ? 600 : 500,
                      textAlign: 'left',
                      transition: workspaceTransitionPresets.colorBorderBg,
                      '&:hover': {
                        backgroundColor: selected
                          ? alpha(theme.palette.primary.main, 0.14)
                          : theme.palette.action.hover,
                      },
                    })}
                  >
                    <Icon sx={{ fontSize: workspaceIconSize.md }} />
                    <Box component="span">{t(`settings:${labelKey}`)}</Box>
                  </ButtonBase>
                </Box>
              )
            })}
          </Stack>
        </Box>

        <Box
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            px: workspaceSpace.xl,
            py: workspaceSpace.lg,
            overflowY: 'auto',
            ...subtleScrollbarSx(theme),
          })}
        >
          {activeSection === 'profile' ? (
            <ProfileSettingsSection createCanvas={createCanvas} createImage={createImage} />
          ) : (
            <LanguageSettingsSection />
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
