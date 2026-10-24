import i18n from '@/i18n'
import type { StudioArtifactKind } from '@/types/api'
import { notifyTaskCompleted } from '@/lib/completionNotification'
import { resolveStudioArtifactFallbackTitle } from './resolveStudioArtifactKind'

export interface StudioCompletionNotice {
  kind: StudioArtifactKind
  title: string
  taskId?: string
}

/** Studio 产物生成完成 → 浏览器通知；文案与降级由 `lib/completionNotification` 统一处理。 */
export const notifyStudioArtifactCompleted = async ({
  kind,
  title,
  taskId,
}: StudioCompletionNotice): Promise<boolean> => {
  const kindLabel = resolveStudioArtifactFallbackTitle(kind)
  const displayTitle = title.trim() || kindLabel
  return notifyTaskCompleted({
    // 标题带具体产物类型，如「视频概览生成完成」。
    titleKey: 'studio:notification.completedTitle',
    titleValues: { kind: kindLabel },
    body: i18n.t('studio:notification.completedBody', { title: displayTitle }),
    taskId,
  })
}
