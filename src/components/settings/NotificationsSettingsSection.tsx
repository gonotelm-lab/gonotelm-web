import { useCallback, useEffect, useState } from 'react'
import { Box, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  patchNotificationPreferences,
  readNotificationPreferences,
} from '../../lib/localPreferences'
import {
  getWebNotificationSupport,
  requestWebNotificationPermission,
  subscribeWebNotificationPermissionChange,
  type WebNotificationSupport,
} from '../../lib/webNotifications'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'

const PERMISSION_STATUS_KEYS: Record<WebNotificationSupport, string> = {
  granted: 'notifications.granted',
  default: 'notifications.needPermission',
  denied: 'notifications.denied',
  unsupported: 'notifications.unsupported',
}

/**
 * 设置 → 通知：长任务（Studio 产物、来源处理）完成时的浏览器通知开关。
 *
 * 开关写入统一 LocalPreferences；浏览器授权独立于此存在，旁边常驻一行授权
 * 状态。denied（被浏览器禁用）时开关禁用并提供「重新检测」——程序无法在
 * 拒绝后再次弹授权框，只能让用户去站点设置里手动恢复。
 */
export function NotificationsSettingsSection() {
  const { t } = useTranslation('settings')
  const [permissionSupport, setPermissionSupport] = useState<WebNotificationSupport>(() =>
    getWebNotificationSupport(),
  )
  const [taskCompletedEnabled, setTaskCompletedEnabled] = useState<boolean>(
    () => readNotificationPreferences().taskCompleted,
  )
  const [requestPending, setRequestPending] = useState(false)

  // 用户在浏览器设置里改授权时（含回到页面的兜底检查）同步到界面。
  useEffect(
    () => subscribeWebNotificationPermissionChange(setPermissionSupport),
    [],
  )

  const recheckSupport = useCallback(() => {
    setPermissionSupport(getWebNotificationSupport())
  }, [])

  const handleSwitchToggle = useCallback(
    async (_event: unknown, checked: boolean) => {
      if (!checked) {
        setTaskCompletedEnabled(false)
        patchNotificationPreferences({ taskCompleted: false })
        return
      }
      // 授权请求要趁本次点击的手势还在（await 后页面未失焦，手势仍有效）。
      if (permissionSupport === 'default') {
        setRequestPending(true)
        const nextSupport = await requestWebNotificationPermission()
        setRequestPending(false)
        setPermissionSupport(nextSupport)
        if (nextSupport !== 'granted') {
          // 授权被拒或不可用：开关保持关闭，不改偏好。
          return
        }
      } else if (permissionSupport !== 'granted') {
        return
      }
      setTaskCompletedEnabled(true)
      patchNotificationPreferences({ taskCompleted: true })
    },
    [permissionSupport],
  )

  const switchDisabled =
    requestPending || permissionSupport === 'denied' || permissionSupport === 'unsupported'

  return (
    <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {t('notifications.title')}
      </Typography>
      <Box>
        <FormControlLabel
          control={
            <Switch
              data-testid="settings-notifications-switch"
              checked={taskCompletedEnabled}
              onChange={handleSwitchToggle}
              disabled={switchDisabled}
            />
          }
          label={t('notifications.switchLabel')}
        />
        <Typography
          data-testid="settings-notifications-permission-status"
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: workspaceDialogLayout.helperTextMt }}
        >
          {t(PERMISSION_STATUS_KEYS[permissionSupport])}
        </Typography>
        {permissionSupport === 'denied' ? (
          <Button
            data-testid="settings-notifications-recheck"
            variant="text"
            size="small"
            onClick={recheckSupport}
            sx={{
              mt: workspaceDialogLayout.helperTextMt,
              alignSelf: 'flex-start',
              textTransform: 'none',
            }}
          >
            {t('notifications.recheck')}
          </Button>
        ) : null}
      </Box>
    </Stack>
  )
}
