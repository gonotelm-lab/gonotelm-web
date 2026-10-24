import i18n from '@/i18n'
import type { SourceCard } from './workspace'
import { notifyTaskCompleted } from '@/lib/completionNotification'

/**
 * 来源处理完成（状态进入 ready）→ 浏览器通知；标题缺省时回落到「未命名来源」。
 * 偏好闸门与降级由 `lib/completionNotification` 统一处理。
 *
 * 由 `store/workspace` 在状态转换的汇聚点调用（轮询写回 / 列表水合替换 / 重试成功），
 * 避免「ready 绕过轮询（列表刷新直接覆盖）」时漏发通知。
 */
export const notifySourceCompleted = async ({
  source,
}: {
  source: SourceCard
}): Promise<boolean> => {
  const title = source.title?.trim() || i18n.t('sources:notification.untitled')
  return notifyTaskCompleted({
    titleKey: 'sources:notification.completedTitle',
    body: i18n.t('sources:notification.completedBody', { title }),
    taskId: source.id,
  })
}

/** 找出 from → to 之间「已知来源状态由非 ready 翻成 ready」的卡片并逐个通知。 */
export const notifyReadyTransitions = (before: SourceCard[], after: SourceCard[]): void => {
  const beforeById = new Map(before.map((card) => [card.id, card]))
  after.forEach((card) => {
    const previous = beforeById.get(card.id)
    if (previous && previous.status !== 'ready' && card.status === 'ready') {
      void notifySourceCompleted({ source: card })
    }
  })
}
