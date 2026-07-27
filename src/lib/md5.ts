import SparkMD5 from 'spark-md5'

export async function fileMd5(file: File): Promise<string> {
  const { md5 } = await hashFile(file)
  return md5
}

/** Read file once for both content hash and authoritative byte size. */
export async function hashFile(file: File): Promise<{ md5: string; size: number }> {
  const buf = await file.arrayBuffer()
  return {
    md5: SparkMD5.ArrayBuffer.hash(buf),
    size: buf.byteLength,
  }
}
