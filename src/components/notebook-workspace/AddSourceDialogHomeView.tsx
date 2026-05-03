import { useRef, useState } from 'react'
import AddLinkIcon from '@mui/icons-material/AddLink'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import NotesIcon from '@mui/icons-material/Notes'
import { Box, Paper, Stack, Typography } from '@mui/material'

interface AddSourceDialogHomeViewProps {
  disabled: boolean
  onCreateFile: (files: File[]) => Promise<void>
  onOpenUrl: () => void
  onOpenText: () => void
}

const maxSourceFileSizeBytes = 100 * 1024 * 1024
const maxSourceFilesPerBatch = 20
const allowedFileExtensions = new Set(['.pdf', '.txt', '.md', '.markdown', '.docx', '.epub'])
const acceptedFileTypes = '.pdf,.txt,.md,.markdown,.docx,.epub'

export function AddSourceDialogHomeView({
  disabled,
  onCreateFile,
  onOpenUrl,
  onOpenText,
}: AddSourceDialogHomeViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileError, setFileError] = useState<string>('')

  const validateFile = (file: File) => {
    const lowerName = file.name.toLowerCase()
    const dotIndex = lowerName.lastIndexOf('.')
    const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : ''
    if (!allowedFileExtensions.has(ext)) {
      return '仅支持 PDF、txt、Markdown、docx、epub 文件'
    }
    if (file.size > maxSourceFileSizeBytes) {
      return '文件大小不能超过 100MB'
    }
    return ''
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary">
        添加来源后，NotebookLM 能够基于这些对您重要的信息提供回答。
      </Typography>

      <Box sx={{ mt: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 2,
            px: 2,
            flex: 1,
            minHeight: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            cursor: disabled ? 'default' : 'pointer',
          }}
          onClick={() => {
            if (!disabled) {
              fileInputRef.current?.click()
            }
          }}
        >
          <Box>
            <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mt: 1 }}>
              上传来源
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              拖放或点击选择文件，即可上传
            </Typography>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
              支持：pdf、txt、markdown、docx、epub
            </Typography>
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}
            >
              单个文件最大 100MB
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              一次最多选择 20 个文件
            </Typography>
            {fileError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {fileError}
              </Typography>
            )}
          </Box>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length === 0) return
              if (files.length > maxSourceFilesPerBatch) {
                setFileError(`一次最多选择 ${maxSourceFilesPerBatch} 个文件`)
                e.currentTarget.value = ''
                return
              }

              for (const file of files) {
                const errMsg = validateFile(file)
                if (errMsg) {
                  setFileError(`${file.name}: ${errMsg}`)
                  e.currentTarget.value = ''
                  return
                }
              }

              setFileError('')
              void onCreateFile(files)
              e.currentTarget.value = ''
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.25,
        }}
      >
        <Paper
          variant="outlined"
          onClick={onOpenUrl}
          sx={{
            p: 1.5,
            minHeight: 88,
            borderRadius: 2,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={0.5} sx={{ justifyContent: 'center', height: '100%' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <AddLinkIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                链接
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 3.25 }}>
              网站
            </Typography>
          </Stack>
        </Paper>
        <Paper
          variant="outlined"
          onClick={onOpenText}
          sx={{
            p: 1.5,
            minHeight: 88,
            borderRadius: 2,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={0.5} sx={{ justifyContent: 'center', height: '100%' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <NotesIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                粘贴文字
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 3.25 }}>
              复制的文字
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </>
  )
}
