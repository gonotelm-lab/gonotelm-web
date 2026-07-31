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
import type { GenerateDataTableParameters } from '@/types/api'
import { workspaceDialogLayout } from '../../shared/ui/dialogLayoutTokens'

interface DataTableSettingsDialogProps {
  open: boolean
  initialParams: GenerateDataTableParameters
  onClose: () => void
  onGenerate: (params: GenerateDataTableParameters) => void
}

export const DataTableSettingsDialog = memo(function DataTableSettingsDialog({
  open,
  initialParams,
  onClose,
  onGenerate,
}: DataTableSettingsDialogProps) {
  const [draftParams, setDraftParams] = useState<GenerateDataTableParameters>(initialParams)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}>
      <DialogTitle>生成数据表</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              附加提示
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: workspaceDialogLayout.helperTextMt }}>
              可补充希望提取的字段、对比维度或表格侧重点。
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={3}
              maxRows={3}
              slotProps={{ htmlInput: { maxLength: 300 } }}
              placeholder="例如：按概念对比定义、适用场景与注意事项。"
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
