import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { COLOR_MODES, type ColorMode } from '../../app/colorMode'
import { setColorMode, useColorMode, useResolvedColorMode } from '../../app/colorModeStore'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { settingsPillToggleSx } from './settingsToggleStyles'

/** 每个选项自己的文案 key（顺序即界面顺序：浅色 → 深色 → 跟随系统）。 */
const COLOR_MODE_LABEL_KEYS: Record<ColorMode, string> = {
  light: 'general.colorModeLight',
  dark: 'general.colorModeDark',
  system: 'general.colorModeSystem',
}

const COLOR_MODE_TEST_IDS: Record<ColorMode, string> = {
  light: 'settings-color-mode-light',
  dark: 'settings-color-mode-dark',
  system: 'settings-color-mode-system',
}

/**
 * 颜色模式：浅色 / 深色 / 跟随系统。
 *
 * 选择立刻生效并写入 localStorage（见 `colorModeStore.setMode`）；
 * 「跟随系统」时额外用一行说明当前实际取到的是哪一种，避免用户猜。
 */
export function ColorModeControl() {
  const { t } = useTranslation('settings')
  const mode = useColorMode()
  const resolvedMode = useResolvedColorMode()

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {t('general.colorModeLabel')}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: workspaceDialogLayout.helperTextMt }}
      >
        {t('general.colorModeHelp')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_event, nextMode: ColorMode | null) => {
          if (nextMode) {
            setColorMode(nextMode)
          }
        }}
        aria-label={t('general.colorModeLabel')}
        sx={{
          mt: workspaceDialogLayout.controlMt,
          gap: workspaceDialogLayout.toggleGap,
          border: 'none',
        }}
      >
        {COLOR_MODES.map((value) => (
          <ToggleButton
            key={value}
            data-testid={COLOR_MODE_TEST_IDS[value]}
            value={value}
            sx={settingsPillToggleSx}
            aria-label={t(COLOR_MODE_LABEL_KEYS[value])}
          >
            {t(COLOR_MODE_LABEL_KEYS[value])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {mode === 'system' ? (
        <Typography
          data-testid="settings-color-mode-system-hint"
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: workspaceDialogLayout.helperTextMt }}
        >
          {t('general.colorModeSystemHint', {
            mode: t(COLOR_MODE_LABEL_KEYS[resolvedMode]),
          })}
        </Typography>
      ) : null}
    </Box>
  )
}
