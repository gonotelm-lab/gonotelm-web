interface ResolveNotebookWorkspaceTitleInput {
  isEditing: boolean
  draftName: string
  storeName: string
  queryName?: string | null
}

/**
 * Workspace 标题显示优先级：
 * - 编辑中：用 draft（避免 HMR/reset 清空 store 后输入框变 Untitled）
 * - 非编辑：store 非空优先（乐观更新）；否则回退 query cache/服务端值
 */
export function resolveNotebookWorkspaceTitle({
  isEditing,
  draftName,
  storeName,
  queryName,
}: ResolveNotebookWorkspaceTitleInput): string {
  if (isEditing) {
    return draftName
  }

  if (storeName.trim()) {
    return storeName
  }

  return queryName ?? ''
}
