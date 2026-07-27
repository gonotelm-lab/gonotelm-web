import { useRef, useState } from 'react'
import AddLinkIcon from '@mui/icons-material/AddLink'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import NotesIcon from '@mui/icons-material/Notes'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { workspaceRadius, workspaceSpace } from '../../../shared/ui/layoutTokens'
import { workspaceInteraction, workspaceTransitionPresets } from '../../../shared/ui/motionTokens'
import { workspaceIconSize } from '../../../shared/ui/typeTokens'

interface AddSourceDialogHomeViewProps {
  disabled: boolean
  onCreateFile: (files: File[]) => Promise<void>
  onOpenUrl: () => void
  onOpenText: () => void
}

const maxSourceFileSizeBytes = 100 * 1024 * 1024
const maxSourceFilesPerBatch = 20
const allowedFileExtensions = new Set(['.pdf', '.txt', '.md', '.markdown', '.csv', '.docx', '.epub'])
const acceptedFileTypes = '.pdf,.txt,.md,.markdown,.csv,.docx,.epub'

const validateSourceFile = (file: File) => {
  const lowerName = file.name.toLowerCase()
  const dotIndex = lowerName.lastIndexOf('.')
  const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : ''
  if (!allowedFileExtensions.has(ext)) {
    return '仅支持 PDF、txt、Markdown、csv、docx、epub 文件'
  }
  if (file.size < 1) {
    return '文件不能为空'
  }
  if (file.size > maxSourceFileSizeBytes) {
    return '文件大小不能超过 100MB'
  }
  return ''
}

export function AddSourceDialogHomeView({
  disabled,
  onCreateFile,
  onOpenUrl,
  onOpenText,
}: AddSourceDialogHomeViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileError, setFileError] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0 || disabled) return
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

    setFileError('')
    void onCreateFile(files)
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary">
        添加来源后，NotebookLM 能够基于这些对您重要的信息提供回答。
      </Typography>

      <Box sx={{ mt: workspaceSpace.lg, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            border: 1,
            borderStyle: 'dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            borderRadius: workspaceRadius.lg,
            px: workspaceSpace.lg,
            flex: 1,
            minHeight: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            cursor: disabled ? 'default' : workspaceInteraction.cursorPointer,
            bgcolor: dragActive ? 'action.hover' : 'transparent',
            transition: workspaceTransitionPresets.borderBg,
          }}
          onClick={() => {
            if (!disabled) {
              fileInputRef.current?.click()
            }
          }}
          onDragEnter={(event) => {
            if (disabled) return
            event.preventDefault()
            event.stopPropagation()
            setDragActive(true)
          }}
          onDragOver={(event) => {
            if (disabled) return
            event.preventDefault()
            event.stopPropagation()
            if (!dragActive) {
              setDragActive(true)
            }
          }}
          onDragLeave={(event) => {
            if (disabled) return
            event.preventDefault()
            event.stopPropagation()
            setDragActive(false)
          }}
          onDrop={(event) => {
            if (disabled) return
            event.preventDefault()
            event.stopPropagation()
            setDragActive(false)
            handleFilesSelected(Array.from(event.dataTransfer.files ?? []))
          }}
        >
          <Box>
            <CloudUploadIcon sx={{ fontSize: workspaceIconSize.xl, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mt: workspaceSpace.sm }}>
              上传来源
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceSpace.sm }}>
              拖放或点击选择文件，即可上传
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: workspaceSpace.md }}>
              支持：pdf、txt、markdown、csv、docx、epub
            </Typography>
            <Typography
              variant="caption"
              sx={(theme) => ({
                display: 'block',
                mt: workspaceSpace.sm,
                fontWeight: 600,
                color: theme.workspacePalette.status.warning,
              })}
            >
              单个文件最大 100MB
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: workspaceSpace.sm }}>
              一次最多选择 20 个文件
            </Typography>
            {fileError && (
              <Typography
                variant="caption"
                sx={(theme) => ({
                  display: 'block',
                  mt: workspaceSpace.sm,
                  color: theme.workspacePalette.status.error,
                })}
              >
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
            aria-label="选择要上传的来源文件"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              handleFilesSelected(files)
              e.currentTarget.value = ''
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          mt: workspaceSpace.lg,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: workspaceSpace.md,
        }}
      >
        <Paper
          variant="outlined"
          onClick={onOpenUrl}
          sx={{
            p: workspaceSpace.md,
            minHeight: 88,
            borderRadius: workspaceRadius.lg,
            cursor: workspaceInteraction.cursorPointer,
            borderStyle: 'dashed',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={workspaceSpace.xxs} sx={{ justifyContent: 'center', height: '100%' }}>
            <Stack direction="row" spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
              <AddLinkIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                链接
              </Typography>
            </Stack>
            <Stack direction="row" spacing={workspaceSpace.sm}>
              <Box sx={{ width: 20, flexShrink: 0 }} aria-hidden />
              <Typography variant="caption" color="text.secondary">
                网站
              </Typography>
            </Stack>
          </Stack>
        </Paper>
        <Paper
          variant="outlined"
          onClick={onOpenText}
          sx={{
            p: workspaceSpace.md,
            minHeight: 88,
            borderRadius: workspaceRadius.lg,
            cursor: workspaceInteraction.cursorPointer,
            borderStyle: 'dashed',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={workspaceSpace.xxs} sx={{ justifyContent: 'center', height: '100%' }}>
            <Stack direction="row" spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
              <NotesIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                粘贴文字
              </Typography>
            </Stack>
            <Stack direction="row" spacing={workspaceSpace.sm}>
              <Box sx={{ width: 20, flexShrink: 0 }} aria-hidden />
              <Typography variant="caption" color="text.secondary">
                复制的文字
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </>
  )
}
