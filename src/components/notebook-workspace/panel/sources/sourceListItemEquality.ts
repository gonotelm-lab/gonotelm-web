import type { SourceListItem } from './types/sourceTypes'

/**
 * 行内容由 item 的这些字段决定 —— 含预览 / 下载用到的内容字段，因为行内回调闭包也持有 item，
 * 任何一个字段变化都必须放行重渲染。
 *
 * 父层（NotebookWorkspacePage）在 sources 变化时会重建 item 对象，
 * 行按字段比较即可让内容没变的来源行整行跳过重渲染。
 */
export const isSameSourceListItem = (prev: SourceListItem, next: SourceListItem) =>
  prev.id === next.id
  && prev.kind === next.kind
  && prev.title === next.title
  && prev.name === next.name
  && prev.iconType === next.iconType
  && prev.status === next.status
  && prev.textContent === next.textContent
  && prev.urlContent === next.urlContent
  && prev.fileFormat === next.fileFormat
  && prev.fileUrl === next.fileUrl
  && prev.parsedContentUrl === next.parsedContentUrl
