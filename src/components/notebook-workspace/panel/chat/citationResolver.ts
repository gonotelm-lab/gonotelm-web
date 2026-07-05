import { getSourceDoc } from '@/api/source'
import type { GetSourceDocResponse } from '@/types/api'

const docSourceCache = new Map<string, string>()

const normalizeDocId = (docId: string) => docId.trim()

export const getCachedSourceIdForDoc = (docId: string) =>
  docSourceCache.get(normalizeDocId(docId))

export const rememberSourceDocMapping = (docId: string, sourceId: string) => {
  const normalizedDocId = normalizeDocId(docId)
  const normalizedSourceId = sourceId.trim()
  if (!normalizedDocId || !normalizedSourceId) {
    return
  }
  docSourceCache.set(normalizedDocId, normalizedSourceId)
}

export async function fetchSourceDocByCitation(
  docId: string,
  sourceId: string,
): Promise<GetSourceDocResponse | null> {
  const normalizedDocId = normalizeDocId(docId)
  const normalizedSourceId = sourceId.trim()
  if (!normalizedDocId || !normalizedSourceId) {
    return null
  }

  try {
    const doc = await getSourceDoc(normalizedSourceId, normalizedDocId)
    rememberSourceDocMapping(normalizedDocId, doc.source_id)
    return doc
  } catch {
    return null
  }
}
