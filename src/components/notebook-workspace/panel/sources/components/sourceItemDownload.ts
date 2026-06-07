import { getSourceParsedContentForDownload } from '@/api/source'

type DownloadDocument = Pick<Document, 'createElement' | 'body'>

export const downloadSourceItemParsedContent = async (
  sourceId: string,
  doc: DownloadDocument = document,
) => {
  const parsedContent = await getSourceParsedContentForDownload(sourceId)
  const downloadUrl = parsedContent?.url?.trim()

  if (!downloadUrl) {
    return
  }
  const anchor = doc.createElement('a')
  anchor.href = downloadUrl
  anchor.download = ''
  anchor.rel = 'noopener noreferrer'
  doc.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
