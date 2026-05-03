const sourceUploadMimeByExt: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.epub': 'application/epub+zip',
}

const supportedSourceUploadMimeSet = new Set(Object.values(sourceUploadMimeByExt))

export function resolveUploadMimeType(file: File): string {
  const normalizedType = file.type.trim().toLowerCase()
  if (normalizedType && supportedSourceUploadMimeSet.has(normalizedType)) {
    return normalizedType
  }

  const lowerName = file.name.toLowerCase()
  const dotIndex = lowerName.lastIndexOf('.')
  const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : ''
  const mimeByExt = sourceUploadMimeByExt[ext]
  if (mimeByExt) return mimeByExt
  if (normalizedType) return normalizedType
  return 'application/octet-stream'
}
