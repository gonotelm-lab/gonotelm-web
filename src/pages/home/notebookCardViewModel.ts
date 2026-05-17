import type { NotebookSummary } from '@/types/api'
import { formatNotebookDate } from './formatNotebookDate'

export interface NotebookCardViewModel {
  id: string
  title: string
  description: string
  sourceCount: number
  dateLabel: string
}

/**
 * 将后端 notebook 数据映射为首页卡片展示模型。
 */
export function toNotebookCardViewModel(
  notebook: NotebookSummary,
): NotebookCardViewModel {
  return {
    id: notebook.id,
    title: notebook.name,
    description: notebook.desc?.trim() ? notebook.desc : '无描述',
    sourceCount: notebook.source_count,
    dateLabel: formatNotebookDate(notebook.updated_at),
  }
}
