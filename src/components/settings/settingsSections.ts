import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'

export type SettingsSectionId = 'profile' | 'security' | 'general'

export interface SettingsSectionDefinition {
  id: SettingsSectionId
  /** Key inside the `settings` i18n namespace. */
  labelKey: string
  Icon: ComponentType<SvgIconProps>
}

/**
 * Settings dialog navigation. Keep the order stable — it is the visual reading
 * order of the left rail, and the first entry is the default section.
 */
export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  { id: 'profile', labelKey: 'nav.profile', Icon: PersonOutlinedIcon },
  { id: 'security', labelKey: 'nav.security', Icon: LockOutlinedIcon },
  { id: 'general', labelKey: 'nav.general', Icon: TuneOutlinedIcon },
]
