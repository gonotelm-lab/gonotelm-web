import { describe, expect, it } from 'vitest'
import { detectEncryptedSourceFile } from './detectEncryptedSourceFile'

const oleHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
const pkHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00])

function fileFromBytes(name: string, bytes: Uint8Array, type = ''): File {
  const copy = new Uint8Array(bytes)
  return new File([copy.buffer], name, { type })
}

function fileFromText(name: string, text: string, type = ''): File {
  return new File([text], name, { type })
}

describe('detectEncryptedSourceFile', () => {
  it('跳过 txt/md/csv', async () => {
    await expect(detectEncryptedSourceFile(fileFromText('a.txt', 'hello'))).resolves.toEqual({
      encrypted: false,
    })
    await expect(detectEncryptedSourceFile(fileFromText('a.md', '# hi'))).resolves.toEqual({
      encrypted: false,
    })
    await expect(detectEncryptedSourceFile(fileFromText('a.csv', 'a,b'))).resolves.toEqual({
      encrypted: false,
    })
  })

  it('明文 PDF（无 /Encrypt）通过', async () => {
    const pdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'
    await expect(detectEncryptedSourceFile(fileFromText('a.pdf', pdf))).resolves.toEqual({
      encrypted: false,
    })
  })

  it('含 /Encrypt 的 PDF 判定加密', async () => {
    const pdf = '%PDF-1.4\n<< /Encrypt 5 0 R /Type /Catalog >>\n%%EOF\n'
    const result = await detectEncryptedSourceFile(fileFromText('secret.pdf', pdf))
    expect(result.encrypted).toBe(true)
    if (result.encrypted) {
      expect(result.reason).toBeTruthy()
    }
  })

  it('PK 头的 docx/xlsx 通过', async () => {
    await expect(detectEncryptedSourceFile(fileFromBytes('a.docx', pkHeader))).resolves.toEqual({
      encrypted: false,
    })
    await expect(detectEncryptedSourceFile(fileFromBytes('a.xlsx', pkHeader))).resolves.toEqual({
      encrypted: false,
    })
  })

  it('OLE 头的 docx/xlsx 判定加密', async () => {
    const docx = await detectEncryptedSourceFile(fileFromBytes('locked.docx', oleHeader))
    const xlsx = await detectEncryptedSourceFile(fileFromBytes('locked.xlsx', oleHeader))
    expect(docx.encrypted).toBe(true)
    expect(xlsx.encrypted).toBe(true)
  })

  it('PK 包内含 EncryptionInfo 入口名时判定加密', async () => {
    const name = 'EncryptionInfo'
    const nameBytes = new TextEncoder().encode(name)
    const local = new Uint8Array(30 + nameBytes.length)
    local[0] = 0x50
    local[1] = 0x4b
    local[2] = 0x03
    local[3] = 0x04
    local[26] = nameBytes.length & 0xff
    local[27] = (nameBytes.length >> 8) & 0xff
    local.set(nameBytes, 30)
    const result = await detectEncryptedSourceFile(fileFromBytes('enc.xlsx', local))
    expect(result.encrypted).toBe(true)
  })

  it('epub 非 PK 头判定加密/无法处理', async () => {
    const result = await detectEncryptedSourceFile(fileFromBytes('a.epub', oleHeader))
    expect(result.encrypted).toBe(true)
  })

  it('epub PK 头默认通过', async () => {
    await expect(detectEncryptedSourceFile(fileFromBytes('a.epub', pkHeader))).resolves.toEqual({
      encrypted: false,
    })
  })
})
