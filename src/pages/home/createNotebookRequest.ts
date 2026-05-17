import type { CreateNotebookRequest } from '@/types/api'

export type CreateNotebookMode = 'with-name' | 'later'

/**
 * 创建请求体构造器：
 * - with-name: 传用户输入（trim 后）
 * - later: name 传空字符串，后端使用默认命名
 */
export function buildCreateNotebookRequest(
  rawName: string,
  mode: CreateNotebookMode,
): CreateNotebookRequest {
  const name = mode === 'later' ? '' : rawName.trim()

  return {
    name,
    desc: '',
  }
}
