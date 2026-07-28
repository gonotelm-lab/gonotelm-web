# Encrypted Source File Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 gonotelm-web 添加来源上传前，用零依赖魔数/结构探测拦截加密的 pdf/docx/xlsx/epub，整批报错且不上传。

**Architecture:** 新增纯函数模块 `detectEncryptedSourceFile`；在 `AddSourceDialogHomeView.handleFilesSelected` 于扩展名/大小校验之后、`onCreateFile` 之前异步调用。不改后端与上传 API。

**Tech Stack:** React、TypeScript、Vitest、浏览器 `File`/`Blob` API（无新 npm 依赖）

**Spec:** `docs/superpowers/specs/2026-07-28-encrypted-source-file-guard-design.md`

## Global Constraints

- 仅前端；不改后端 / 上传 API
- 文本扩展名 `.txt` `.md` `.markdown` `.csv` 跳过检测
- 二进制：`.pdf` `.docx` `.xlsx` `.epub` 检测
- 批量：任一加密或读失败 → 整批中止，不调用 `onCreateFile`
- 用户可见加密文案：`文件已加密，无法处理`（前缀 `{文件名}: `）
- 读失败文案：`无法读取文件内容`
- 零新依赖；偏保守（宁可漏报，少误杀）
- Commit 步骤仅在用户明确要求提交时执行

## File map

| 文件 | 职责 |
|------|------|
| Create `src/lib/detectEncryptedSourceFile.ts` | 按扩展名探测是否加密 |
| Create `src/lib/detectEncryptedSourceFile.test.ts` | 单元测试 |
| Modify `src/components/.../AddSourceDialogHomeView.tsx` | 接入预检 + checking 态 |
| Verify xlsx 已在 `allowedFileExtensions` / 文案（当前仓库已包含则跳过） |

---

### Task 1: `detectEncryptedSourceFile` 核心检测（TDD）

**Files:**
- Create: `gonotelm-web/src/lib/detectEncryptedSourceFile.ts`
- Create: `gonotelm-web/src/lib/detectEncryptedSourceFile.test.ts`

**Interfaces:**
- Produces:
  - `export type EncryptedCheckResult = { encrypted: false } | { encrypted: true; reason: string }`
  - `export async function detectEncryptedSourceFile(file: File): Promise<EncryptedCheckResult>`

- [x] **Step 1: Write the failing tests**

```ts
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
    // Minimal bytes: PK local header + filename "EncryptionInfo"
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd gonotelm-web && pnpm test -- src/lib/detectEncryptedSourceFile.test.ts
```

Expected: FAIL（模块不存在或导出缺失）

- [ ] **Step 3: Implement `detectEncryptedSourceFile.ts`**

```ts
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
  // Avoid TextDecoder for binary; scan ASCII needle
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
  // Scan ZIP local file headers (signature PK\x03\x04) for file name field
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
      // substring search in name
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
    // Unknown wrapper; conservative: do not block (avoid false positive)
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
  // Only block when META-INF/encryption.xml is present (common DRM / encryption manifest)
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
```

Note on `read-failed`: 实现里用 `encrypted: true` + reason，UI 层根据 `reason === 'read-failed'` 展示「无法读取文件内容」；其余加密展示「文件已加密，无法处理」。也可在模块额外导出文案 helper（见 Task 2）。

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd gonotelm-web && pnpm test -- src/lib/detectEncryptedSourceFile.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit（仅当用户要求）**

```bash
git add gonotelm-web/src/lib/detectEncryptedSourceFile.ts gonotelm-web/src/lib/detectEncryptedSourceFile.test.ts
git commit -m "$(cat <<'EOF'
feat(web): detect encrypted pdf/docx/xlsx/epub before upload

EOF
)"
```

---

### Task 2: 接入 `AddSourceDialogHomeView`

**Files:**
- Modify: `gonotelm-web/src/components/notebook-workspace/panel/sources/components/AddSourceDialogHomeView.tsx`

**Interfaces:**
- Consumes: `detectEncryptedSourceFile` from `../../../../../../lib/detectEncryptedSourceFile`（按文件实际相对路径调整；从该组件到 `src/lib` 为 `../../../../../lib/detectEncryptedSourceFile` — **以组件文件深度为准**：

  `panel/sources/components/AddSourceDialogHomeView.tsx` → 上溯 5 级到 `src` → `../../../../../lib/detectEncryptedSourceFile`

- Produces: 选文件后加密预检；`checking` 态禁用重复选择

- [ ] **Step 1: 增加 import、文案 helper 与 checking state**

在文件顶部增加：

```ts
import { detectEncryptedSourceFile } from '../../../../../lib/detectEncryptedSourceFile'
```

在组件内：

```ts
const [checking, setChecking] = useState(false)
const interactionDisabled = disabled || checking
```

增加本地 helper（可放在组件外）：

```ts
function encryptedUserMessage(fileName: string, reason: string): string {
  if (reason === 'read-failed') {
    return `${fileName}: 无法读取文件内容`
  }
  return `${fileName}: 文件已加密，无法处理`
}
```

- [ ] **Step 2: 改写 `handleFilesSelected` 为 async 预检**

替换现有 `handleFilesSelected` 为：

```ts
const handleFilesSelected = (files: File[]) => {
  if (files.length === 0 || interactionDisabled) return
  if (files.length > maxSourceFilesPerBatch) {
    setFileError(`一次最多选择 ${maxSourceFilesPerBatch} 个文件`)
    return
  }

  for (const file of files) {
    const errMsg = validateSourceFile(file)
    if (errMsg) {
      setFileError(`${file.name}: ${errMsg}`)
      return
    }
  }

  void (async () => {
    setChecking(true)
    setFileError('')
    try {
      for (const file of files) {
        const result = await detectEncryptedSourceFile(file)
        if (result.encrypted) {
          setFileError(encryptedUserMessage(file.name, result.reason))
          return
        }
      }
      await onCreateFile(files)
    } catch {
      const first = files[0]
      setFileError(
        first ? `${first.name}: 无法读取文件内容` : '无法读取文件内容',
      )
    } finally {
      setChecking(false)
    }
  })()
}
```

- [ ] **Step 3: 将交互禁用绑定到 `interactionDisabled`**

把拖放区 / input 相关的 `disabled` 判断改为 `interactionDisabled`（`onClick`、`onDrag*`、`onDrop`、`cursor`）。`onOpenUrl` / `onOpenText` 的 Paper 可保持只用父级 `disabled`（加密检测不应挡住链接/粘贴入口），或一并禁用——**采用：仅文件上传区受 `checking` 影响**。

可选：检测中在上传区增加一行 caption「正在检查文件…」（非必须；有则更好）。

- [ ] **Step 4: 确认 xlsx 白名单与文案**

若 `allowedFileExtensions` / `accept` / 「支持：…」已含 `.xlsx`，无需再改。若缺失则补上。

- [ ] **Step 5: 跑相关单测 + 类型检查**

```bash
cd gonotelm-web && pnpm test -- src/lib/detectEncryptedSourceFile.test.ts && pnpm exec tsc -b --pretty false
```

Expected: PASS / 无新增 TS 错误

- [ ] **Step 6: 手动冒烟（可选）**

1. 正常 pdf/docx/xlsx → 可上传  
2. 加密文件 → 对话框报错，Network 无 create source / upload  
3. 批量混入加密 → 整批不上传  

- [ ] **Step 7: Commit（仅当用户要求）**

```bash
git add gonotelm-web/src/components/notebook-workspace/panel/sources/components/AddSourceDialogHomeView.tsx
git commit -m "$(cat <<'EOF'
feat(web): block encrypted source files in add-source dialog

EOF
)"
```

---

## Spec coverage checklist

| Spec 要求 | Task |
|-----------|------|
| 仅前端预检 | Task 1–2 |
| pdf `/Encrypt` | Task 1 |
| docx/xlsx OLE + EncryptionInfo | Task 1 |
| epub 非 ZIP / encryption.xml | Task 1 |
| 文本跳过 | Task 1 |
| 整批拦截 | Task 2 |
| 错误文案 | Task 2 |
| 不改上传 API | （无任务改动） |
| xlsx 白名单 | Task 2 Step 4（已存在则跳过） |
| 单测 | Task 1 |

## Manual acceptance

与 spec 验收标准一致：加密不上传；混批整批拦；明文行为不变。
