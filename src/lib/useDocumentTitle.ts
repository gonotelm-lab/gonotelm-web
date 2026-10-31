import { useEffect } from 'react'

const APP_DOCUMENT_TITLE = 'GoNoteLM'

/**
 * 仅在 title 有非空值时改写浏览器标签；否则保持产品默认标题。
 * 不加任何前缀/后缀。`enabled=false` 时不改动。
 */
export function useDocumentTitle(title?: string | null, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return
    }
    const previous = document.title
    const trimmed = title?.trim() ?? ''
    document.title = trimmed || APP_DOCUMENT_TITLE
    return () => {
      document.title = previous || APP_DOCUMENT_TITLE
    }
  }, [title, enabled])
}
