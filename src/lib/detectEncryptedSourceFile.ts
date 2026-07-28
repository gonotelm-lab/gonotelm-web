export type EncryptedCheckResult =
  | { encrypted: false }
  | { encrypted: true; reason: string }

const SKIP_EXTS = new Set(['.txt', '.md', '.markdown', '.csv'])
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const
const PDF_PROBE_BYTES = 64 * 1024
const ZIP_PROBE_BYTES = 256 * 1024

function getExt(fileName: string): string {
  const lower = fileName.toLowerCase()
  const dot = lower.lastIndexOf('.')
  return dot >= 0 ? lower.slice(dot) : ''
}

function startsWithBytes(buf: Uint8Array, magic: readonly number[]): boolean {
  if (buf.length < magic.length) return false
  return magic.every((b, i) => buf[i] === b)
}

function isZipLocalHeader(buf: Uint8Array): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
}

async function readSlice(file: File, start: number, length: number): Promise<Uint8Array> {
  const end = Math.min(file.size, start + length)
  if (start >= end) return new Uint8Array()
  const buf = await file.slice(start, end).arrayBuffer()
  return new Uint8Array(buf)
}

function latin1Includes(buf: Uint8Array, needle: string): boolean {
  const n = needle.length
  outer: for (let i = 0; i <= buf.length - n; i++) {
    for (let j = 0; j < n; j++) {
      if (buf[i + j] !== needle.charCodeAt(j)) continue outer
    }
    return true
  }
  return false
}

function zipEntryNamesContain(buf: Uint8Array, needle: string): boolean {
  const needleBytes = new TextEncoder().encode(needle)
  let offset = 0
  while (offset + 30 <= buf.length) {
    if (
      buf[offset] !== 0x50 ||
      buf[offset + 1] !== 0x4b ||
      buf[offset + 2] !== 0x03 ||
      buf[offset + 3] !== 0x04
    ) {
      offset++
      continue
    }
    const nameLen = buf[offset + 26] | (buf[offset + 27] << 8)
    const extraLen = buf[offset + 28] | (buf[offset + 29] << 8)
    const nameStart = offset + 30
    const nameEnd = nameStart + nameLen
    if (nameEnd > buf.length) break
    const name = buf.subarray(nameStart, nameEnd)
    if (name.length >= needleBytes.length) {
      outer: for (let i = 0; i <= name.length - needleBytes.length; i++) {
        for (let j = 0; j < needleBytes.length; j++) {
          if (name[i + j] !== needleBytes[j]) continue outer
        }
        return true
      }
    }
    const compSize =
      (buf[offset + 18] |
        (buf[offset + 19] << 8) |
        (buf[offset + 20] << 16) |
        (buf[offset + 21] << 24)) >>>
      0
    offset = nameEnd + extraLen + compSize
  }
  return false
}

async function detectPdfEncrypted(file: File): Promise<EncryptedCheckResult> {
  const head = await readSlice(file, 0, PDF_PROBE_BYTES)
  if (latin1Includes(head, '/Encrypt')) {
    return { encrypted: true, reason: 'pdf-/Encrypt' }
  }
  if (file.size > PDF_PROBE_BYTES) {
    const tailStart = Math.max(0, file.size - PDF_PROBE_BYTES)
    const tail = await readSlice(file, tailStart, PDF_PROBE_BYTES)
    if (latin1Includes(tail, '/Encrypt')) {
      return { encrypted: true, reason: 'pdf-/Encrypt' }
    }
  }
  return { encrypted: false }
}

async function detectOfficeOpenXmlEncrypted(file: File): Promise<EncryptedCheckResult> {
  const head = await readSlice(file, 0, Math.min(ZIP_PROBE_BYTES, Math.max(file.size, 8)))
  if (startsWithBytes(head, OLE_MAGIC)) {
    return { encrypted: true, reason: 'ole-cfb' }
  }
  if (!isZipLocalHeader(head)) {
    return { encrypted: false }
  }
  const probe = file.size <= ZIP_PROBE_BYTES ? head : await readSlice(file, 0, ZIP_PROBE_BYTES)
  if (zipEntryNamesContain(probe, 'EncryptionInfo')) {
    return { encrypted: true, reason: 'ooxml-EncryptionInfo' }
  }
  return { encrypted: false }
}

async function detectEpubEncrypted(file: File): Promise<EncryptedCheckResult> {
  const head = await readSlice(file, 0, Math.min(ZIP_PROBE_BYTES, Math.max(file.size, 8)))
  if (!isZipLocalHeader(head)) {
    return { encrypted: true, reason: 'epub-not-zip' }
  }
  const probe = file.size <= ZIP_PROBE_BYTES ? head : await readSlice(file, 0, ZIP_PROBE_BYTES)
  if (zipEntryNamesContain(probe, 'META-INF/encryption.xml')) {
    return { encrypted: true, reason: 'epub-encryption.xml' }
  }
  return { encrypted: false }
}

export async function detectEncryptedSourceFile(file: File): Promise<EncryptedCheckResult> {
  const ext = getExt(file.name)
  if (SKIP_EXTS.has(ext)) {
    return { encrypted: false }
  }

  try {
    switch (ext) {
      case '.pdf':
        return await detectPdfEncrypted(file)
      case '.docx':
      case '.xlsx':
        return await detectOfficeOpenXmlEncrypted(file)
      case '.epub':
        return await detectEpubEncrypted(file)
      default:
        return { encrypted: false }
    }
  } catch {
    return { encrypted: true, reason: 'read-failed' }
  }
}
