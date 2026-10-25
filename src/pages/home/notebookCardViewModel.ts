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
  isPublic: boolean
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
    title: notebook.name.trim() || i18n.t('home:card.untitled'),
    description: customDesc || i18n.t('home:card.noDescription'),
    sourceCount: notebook.source_count,
    // 卡片日期展示创建时间；列表排序仍走 updated_at（sortBy 由后端处理）。
    // 旧后端缺 created_at 时回退更新时间，避免显示「未知日期」。
    dateLabel: formatNotebookDate(notebook.created_at ?? notebook.updated_at),
    isPublic: notebook.visibility === 'public',
    owner: notebook.owner
      ? {
          nickname: notebook.owner.nickname,
          avatarUrl: notebook.owner.avatar_url,
        }
      : undefined,
  }
}
