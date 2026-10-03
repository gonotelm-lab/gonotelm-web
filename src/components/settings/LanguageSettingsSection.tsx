import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LOCALE, type AppLocale } from '../../i18n'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceType } from '../notebook-workspace/shared/ui/typeTokens'

const normalizeLocale = (lng: string | undefined): AppLocale =>
  (lng ?? DEFAULT_LOCALE).toLowerCase().startsWith('en') ? 'en' : 'zh'

const languageToggleSx = {
  minWidth: 96,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 999,
  margin: 0,
  px: workspaceSpace.md,
  py: workspaceSpace.xxs,
  textTransform: 'none',
  fontSize: workspaceType.sm,
  '&.MuiToggleButtonGroup-grouped': {
    borderRadius: '999px !important',
    margin: 0,
  },
  '&.MuiToggleButtonGroup-grouped:not(:first-of-type)': {
    borderLeft: '1px solid',
    borderColor: 'divider',
  },
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    borderColor: 'primary.main',
    '&:hover': {
      bgcolor: 'primary.dark',
    },
  },
} as const

export function LanguageSettingsSection() {
  const { t, i18n } = useTranslation('settings')
  const activeLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language)

  const handleLocaleChange = (nextLocale: AppLocale | null) => {
    if (!nextLocale || nextLocale === activeLocale) {
      return
    }
    // LanguageDetector 负责把选择写回 localStorage（gonotelm.locale）。
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
          sx={{ mt: workspaceDialogLayout.controlMt, gap: workspaceDialogLayout.toggleGap, border: 'none' }}
        >
          <ToggleButton
            data-testid="settings-language-zh"
            value="zh"
            sx={languageToggleSx}
            aria-label={t('general.languageZh')}
          >
            {t('general.languageZh')}
          </ToggleButton>
          <ToggleButton
            data-testid="settings-language-en"
            value="en"
            sx={languageToggleSx}
            aria-label={t('general.languageEn')}
          >
            {t('general.languageEn')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Stack>
  )
}
