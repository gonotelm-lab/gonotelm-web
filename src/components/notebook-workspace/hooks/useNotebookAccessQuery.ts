import { useQuery } from '@tanstack/react-query'
import { getNotebookAccess } from '../../../api/notebook'
import type { NotebookAccess } from '../../../types/api'

/**
 * 分享入口只属于 owner（后端 access.role 取值 owner / collaborator / viewer）。
 * 抽成纯函数，方便单测锁住“非 owner 不显示分享按钮”这条规则。
 */
export const isNotebookOwner = (access: NotebookAccess | undefined) =>
  access?.role === 'owner'

/**
 * 顶栏（决定是否显示分享入口）与分享对话框共用同一个 query key。
 * 页面加载时先取一次 access，打开分享对话框时就不会再重复请求。
 */
export const notebookAccessQueryKey = (notebookId: string) =>
  ['notebook-access', notebookId] as const

export function useNotebookAccessQuery(
  notebookId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: notebookAccessQueryKey(notebookId),
    queryFn: () => getNotebookAccess(notebookId),
    enabled: enabled && Boolean(notebookId),
  })
}
