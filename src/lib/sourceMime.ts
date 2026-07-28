const sourceUploadMimeByExt: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.epub': 'application/epub+zip',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const normalizeMimeType = (mimeType: string) =>
  mimeType
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase() ?? ''

const canonicalMimeByMediaType = new Map(
  Object.values(sourceUploadMimeByExt).map((mimeType) => [normalizeMimeType(mimeType), mimeType]),
)

export function resolveUploadMimeType(file: File): string {
  const normalizedType = file.type.trim().toLowerCase()
  const canonicalMimeType = canonicalMimeByMediaType.get(normalizeMimeType(normalizedType))
  if (canonicalMimeType) {
    return canonicalMimeType
  }

  const lowerName = file.name.toLowerCase()
  const dotIndex = lowerName.lastIndexOf('.')
  const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : ''
  const mimeByExt = sourceUploadMimeByExt[ext]
  if (mimeByExt) return mimeByExt
  if (normalizedType) return normalizedType
  return 'application/octet-stream'
}
