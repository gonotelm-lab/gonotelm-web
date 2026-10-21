import i18n from '@/i18n'
import type { NotebookSummary } from '@/types/api'
import { formatNotebookDate } from './formatNotebookDate'

export interface NotebookCardOwnerViewModel {
  nickname: string
  avatarUrl: string
}

export interface NotebookCardViewModel {
  id: string
  title: string
  description: string
  sourceCount: number
  dateLabel: string
  owner?: NotebookCardOwnerViewModel
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
    description: notebook.desc?.trim() ? notebook.desc : i18n.t('home:card.noDescription'),
    sourceCount: notebook.source_count,
    dateLabel: formatNotebookDate(notebook.updated_at),
    owner: notebook.owner
      ? {
          nickname: notebook.owner.nickname,
          avatarUrl: notebook.owner.avatar_url,
        }
      : undefined,
  }
}
