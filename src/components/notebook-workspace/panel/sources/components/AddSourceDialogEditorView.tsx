import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import { workspaceSpace } from '../../../shared/ui/layoutTokens'

type EditorViewMode = 'url' | 'text'

interface AddSourceDialogEditorViewProps {
  view: EditorViewMode
  disabled: boolean
  urlInput: string
  textInput: string
  textMaxChars: number
  textCharCount: number
  hasSubmitValue: boolean
  onBack: () => void
  onUrlChange: (value: string) => void
  onTextChange: (value: string) => void
  onSubmit: () => Promise<void>
}

export function AddSourceDialogEditorView({
  view,
  disabled,
  urlInput,
  textInput,
  textMaxChars,
  textCharCount,
  hasSubmitValue,
  onBack,
  onUrlChange,
  onTextChange,
  onSubmit,
}: AddSourceDialogEditorViewProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton size="small" onClick={onBack} disabled={disabled} aria-label="返回">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {view === 'url' ? '链接' : '粘贴文字'}
        </Typography>
      </Stack>
      <Box sx={{ mt: workspaceSpace.md, flex: 1, minHeight: 0 }}>
        {view === 'url' ? (
          <TextField
            fullWidth
            size="small"
            label="链接"
            placeholder="https://example.com/article"
            value={urlInput}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        ) : (
          <TextField
            fullWidth
            multiline
            minRows={14}
            maxRows={14}
            label="粘贴文字"
            placeholder="粘贴你要添加的文本内容..."
            value={textInput}
            onChange={(e) => onTextChange(e.target.value)}
            helperText={`${textCharCount}/${textMaxChars}`}
            slotProps={{
              htmlInput: {
                maxLength: textMaxChars,
              },
            }}
          />
        )}
      </Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'flex-end',
          mt: workspaceSpace.lg,
          pt: workspaceSpace.md,
          borderTop: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Button
          onClick={() => {
            void onSubmit()
          }}
          disabled={disabled || !hasSubmitValue}
          variant="contained"
        >
          添加来源
        </Button>
      </Stack>
    </Box>
  )
}
