import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LOCALE, type AppLocale } from '../../i18n'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { ColorModeControl } from './ColorModeControl'
import { settingsPillToggleSx } from './settingsToggleStyles'

const normalizeLocale = (lng: string | undefined): AppLocale =>
  (lng ?? DEFAULT_LOCALE).toLowerCase().startsWith('en') ? 'en' : 'zh'

/**
 * 设置 → 通用：界面语言与颜色模式。
 *
 * 两项都是「立即生效 + 记住选择」的本地偏好，统一写入
 * `gonotelm.preferences`（见 `lib/localPreferences`）。
 */
export function GeneralSettingsSection() {
  const { t, i18n } = useTranslation('settings')
  const activeLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language)

  const handleLocaleChange = (nextLocale: AppLocale | null) => {
    if (!nextLocale || nextLocale === activeLocale) {
      return
    }
    // i18n 自定义 detector 会把语言写回 LocalPreferences。
    void i18n.changeLanguage(nextLocale)
  }

  return (
    <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('general.title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: workspaceDialogLayout.helperTextMt }}
        >
          {t('general.subtitle')}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('general.languageLabel')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: workspaceDialogLayout.helperTextMt }}
        >
          {t('general.languageHelp')}
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={activeLocale}
          onChange={(_event, nextLocale: AppLocale | null) => handleLocaleChange(nextLocale)}
          aria-label={t('general.languageLabel')}
          sx={{
            mt: workspaceDialogLayout.controlMt,
            gap: workspaceDialogLayout.toggleGap,
            border: 'none',
          }}
        >
          <ToggleButton
            data-testid="settings-language-zh"
            value="zh"
            sx={settingsPillToggleSx}
            aria-label={t('general.languageZh')}
          >
            {t('general.languageZh')}
          </ToggleButton>
          <ToggleButton
            data-testid="settings-language-en"
            value="en"
            sx={settingsPillToggleSx}
            aria-label={t('general.languageEn')}
          >
            {t('general.languageEn')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ColorModeControl />
    </Stack>
  )
}
