import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SETTINGS_SECTIONS, type SettingsSectionId } from './settingsSections'

/**
 * 设置对话框在 URL 上的参数名：`?settings=<分区>`。
 *
 * 对话框本身是浮层，但「打开哪个分区」放在 URL 里之后，它就成了可寻址的位置：
 * - 第三方绑定的 `return_to` 能带上它，绑完/失败后回到「那一页 + 设置已打开 + 原分区」；
 * - 刷新、分享链接、后退都能还原，而不是打开状态只活在内存里。
 */
export const SETTINGS_SEARCH_PARAM = 'settings'

const DEFAULT_SECTION: SettingsSectionId = 'profile'

const SECTION_IDS: readonly SettingsSectionId[] = SETTINGS_SECTIONS.map((section) => section.id)

function toSectionId(raw: string | null): SettingsSectionId {
  // 未知值（手改 URL、旧链接）退回默认分区，而不是把对话框判成关闭。
  return SECTION_IDS.includes(raw as SettingsSectionId)
    ? (raw as SettingsSectionId)
    : DEFAULT_SECTION
}

export interface SettingsDialogRoute {
  isOpen: boolean
  activeSection: SettingsSectionId
  /** 打开对话框（默认 profile）。写 history（push），这样后退键等于「关闭」。 */
  openSettings: (section?: SettingsSectionId) => void
  /** 关闭：只改 URL，不新增 history。 */
  closeSettings: () => void
  /** 切换分区：replace，避免每点一次导航栏就压一条历史。 */
  selectSection: (section: SettingsSectionId) => void
}

/**
 * 把设置对话框的「开/关 + 当前分区」绑到 URL 的 `?settings=` 上。
 *
 * 历史记录策略：打开用 push、切换/关闭用 replace。于是「打开 → 后退」正好是关闭，
 * 而「关闭」不会把用户按两次后退才离开页面。
 */
export function useSettingsDialogRoute(): SettingsDialogRoute {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(SETTINGS_SEARCH_PARAM)
  const isOpen = raw !== null
  const activeSection = toSectionId(raw)

  const write = useCallback(
    (section: SettingsSectionId | null, replace: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (section) {
            next.set(SETTINGS_SEARCH_PARAM, section)
          } else {
            next.delete(SETTINGS_SEARCH_PARAM)
          }
          return next
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  const openSettings = useCallback(
    (section: SettingsSectionId = DEFAULT_SECTION) => {
      // 已经打开时只切分区，不再压一条历史，否则后退要按很多次才关得掉。
      write(section, isOpen)
    },
    [isOpen, write],
  )

  const closeSettings = useCallback(() => write(null, true), [write])

  const selectSection = useCallback(
    (section: SettingsSectionId) => write(section, true),
    [write],
  )

  return { isOpen, activeSection, openSettings, closeSettings, selectSection }
}
