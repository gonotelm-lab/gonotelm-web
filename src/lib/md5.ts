import SparkMD5 from 'spark-md5'

export async function fileMd5(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  return SparkMD5.ArrayBuffer.hash(buf)
}
