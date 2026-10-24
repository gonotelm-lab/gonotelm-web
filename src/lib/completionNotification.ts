import i18n from '@/i18n'
import { readNotificationPreferences } from '@/lib/localPreferences'
import { showWebNotification } from '@/lib/webNotifications'

const focusExistingWindow = () => {
  try {
    window.focus()
  } catch {
    // 窗口已被关闭，只当没有点过这条通知。
  }
}

export interface TaskCompletionNotice {
  /** 通知标题文案 key（含命名空间），如 `studio:notification.completedTitle`。 */
  titleKey: string
  /** 标题插值参数，如 `{ kind: '视频概览' }`，配合 "{{kind}}生成完成"。 */
  titleValues?: Record<string, unknown>
  /** 正文，调用方已拼好具体的任务名。 */
  body: string
  /** 绑定到通知 tag，用任务 id 去重同一任务的重复结果。 */
  taskId?: string
}

/**
 * 长任务完成 → 浏览器通知（Studio 产物与来源处理共用）。
 *
 * 只在用户于设置里开启「任务完成时通知」后生效；未授权 / 不支持时返回
 * false 静默跳过（结果本身仍会在界面里展示，不受影响）。
 */
export const notifyTaskCompleted = async ({
  titleKey,
  titleValues,
  body,
  taskId,
}: TaskCompletionNotice): Promise<boolean> => {
  if (!readNotificationPreferences().taskCompleted) {
    return false
  }
  const titleText = i18n.t(titleKey, titleValues)
  const sentViaWebNotification = await showWebNotification({
    title: titleText,
    body,
    tag: taskId ? `gonotelm:task:${taskId}` : undefined,
    onClick: focusExistingWindow,
  })
  if (!sentViaWebNotification) {
    // 排查线索：开关已开但浏览器没把通知发出来（通常是授权被浏览器重置/撤销）。
    console.warn('[notifications] web notification not sent', {
      title: titleText,
      taskId,
    })
  }
  return sentViaWebNotification
}
