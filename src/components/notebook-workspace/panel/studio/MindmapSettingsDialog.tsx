import { memo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { GenerateMindmapParameters } from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'
import { defaultMindmapParameters } from './mindmapSettings'

interface MindmapSettingsDialogProps {
  open: boolean
  initialParams: GenerateMindmapParameters
  onClose: () => void
  onGenerate: (params: GenerateMindmapParameters) => void
}

export const MindmapSettingsDialog = memo(function MindmapSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: MindmapSettingsDialogProps) {
  const [draftParams, setDraftParams] = useState<GenerateMindmapParameters>(initialParams)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>生成思维导图</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              附加提示
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              可补充强调重点、指定层级偏好或结构要求。
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={3}
              maxRows={3}
              inputProps={{ maxLength: 300 }}
              placeholder="例如：请侧重'实施路径'和'风险'两个分支。"
              value={draftParams.tip || ''}
              onChange={(event) =>
                setDraftParams((prev) => ({ ...prev, tip: event.target.value }))
              }
              sx={{ mt: workspaceDialogLayout.controlMt }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => onGenerate(draftParams)}>
          生成
        </Button>
      </DialogActions>
    </Dialog>
  )
})
