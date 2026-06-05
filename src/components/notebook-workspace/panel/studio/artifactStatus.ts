import type { StudioArtifactTaskStatus } from '@/types/api'

const failedTaskStatusSet = new Set(['failed', 'cancelled', 'expired'])
const pendingTaskStatusSet = new Set(['pending', 'running'])
export type StudioArtifactVisualStatus = 'queued' | 'polling' | 'succeeded' | 'failed'

const normalizeStudioTaskStatus = (status: StudioArtifactTaskStatus) =>
  String(status || '').trim().toLowerCase()

export const isStudioTaskCompleted = (status: StudioArtifactTaskStatus) =>
  normalizeStudioTaskStatus(status) === 'completed'

export const isStudioTaskFailed = (status: StudioArtifactTaskStatus) =>
  failedTaskStatusSet.has(normalizeStudioTaskStatus(status))

export const isStudioTaskRetryable = (status: StudioArtifactTaskStatus) =>
  normalizeStudioTaskStatus(status) === 'failed'

export const shouldStudioTaskKeepPolling = (status: StudioArtifactTaskStatus) =>
  pendingTaskStatusSet.has(normalizeStudioTaskStatus(status))

export const isStudioTaskRunning = (status: StudioArtifactTaskStatus) =>
  normalizeStudioTaskStatus(status) === 'running'

export const toArtifactVisualStatus = (
  status: StudioArtifactTaskStatus,
): StudioArtifactVisualStatus => {
  const normalized = normalizeStudioTaskStatus(status)
  if (normalized === 'completed') {
    return 'succeeded'
  }
  if (failedTaskStatusSet.has(normalized)) {
    return 'failed'
  }
  if (normalized === 'pending') {
    return 'queued'
  }
  return 'polling'
}

export const buildTaskFailedMessage = (status: StudioArtifactTaskStatus) => {
  const normalized = normalizeStudioTaskStatus(status)
  if (normalized === 'cancelled') {
    return '任务已取消，请重试。'
  }
  if (normalized === 'expired') {
    return '任务已过期，请重新生成。'
  }
  return '任务执行失败，请重试。'
}
