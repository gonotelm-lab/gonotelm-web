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
 * 首页只展示自定义摘要；未开启自定义（含脏 desc）一律走占位文案，不做 AI 摘要。
 */
export function toNotebookCardViewModel(
  notebook: NotebookSummary,
): NotebookCardViewModel {
  const customDesc =
    notebook.flags?.customize_description === true
      ? notebook.desc?.trim()
      : ''
  return {
    id: notebook.id,
    title: notebook.name,
    description: customDesc || i18n.t('home:card.noDescription'),
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
