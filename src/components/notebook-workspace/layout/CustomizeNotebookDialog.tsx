import { useRef, useState } from 'react'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  deleteNotebookCover,
  uploadNotebookCoverImage,
} from '../../../api/notebookCover'
import { updateNotebook } from '../../../api/notebook'
import { showAppToast } from '../../../lib/apiErrorToast'
import {
  COVER_INPUT_ACCEPT,
  CoverImageValidationError,
  CoverProcessError,
  checkCoverFile,
  preprocessCoverFile,
  type CoverFileIssue,
} from '../../../lib/coverImageProcessing'
import { ApiError } from '../../../lib/http'
import type { Notebook, UpdateNotebookRequest } from '../../../types/api'
import { workspaceDialogLayout } from '../shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../shared/ui/motionTokens'
import { workspaceIconSize } from '../shared/ui/typeTokens'

const MAX_NAME_LENGTH = 128
const MAX_DESCRIPTION_LENGTH = 1024

/** 封面上的纯图标操作：跟随主题 ink 色，尺寸与项目其他 IconButton 一致。 */
const coverOverlayIconSx = {
  fontSize: workspaceIconSize.md,
} as const

export interface CustomizeNotebookSavedState {
  name: string
  desc: string
  customizeDescription: boolean
}

interface CustomizeNotebookDialogProps {
  notebookId: string
  open: boolean
  /** 打开时传入的当前名称，用于预填。 */
  notebookName: string
  /** 当前已落库的自定义摘要（未开启时为空）。 */
  description: string
  customizeDescription: boolean
  /** 打开时的生效封面直链；无封面传 undefined。 */
  coverUrl?: string
  /** 封面上传/删除生效后立即回传（null = 已清空），页面负责同步 zustand。 */
  onCoverChange?: (coverUrl: string | null) => void
  onClose: () => void
  onSaved: (next: CustomizeNotebookSavedState) => void
}

/**
 * 「自定义笔记本」：名称预填；摘要用右侧胶囊开关（开才能编辑），点「完成」一次提交。
 * 封面独立于「完成」：上传/删除即时生效（presign 直传 + confirm），失败只提示不打断其他编辑。
 */
export function CustomizeNotebookDialog({
  notebookId,
  open,
  notebookName,
  description,
  customizeDescription,
  coverUrl,
  onCoverChange,
  onClose,
  onSaved,
}: CustomizeNotebookDialogProps) {
  const { t } = useTranslation(['workspace', 'common'])
  const queryClient = useQueryClient()
  // 仅在 open 时由父级挂载，用 props 初始化即可保证名称/开关/封面预填正确。
  const [draftName, setDraftName] = useState(() => notebookName)
  const [draftDesc, setDraftDesc] = useState(() => description)
  const [draftCustomize, setDraftCustomize] = useState(() => customizeDescription)
  const [draftCoverUrl, setDraftCoverUrl] = useState<string | null>(
    () => coverUrl?.trim() || null,
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateNotebookRequest) => {
      await updateNotebook(notebookId, payload)
      return payload
    },
    onSuccess: (payload) => {
      const nextName = payload.name ?? draftName.trim()
      const nextCustomize = payload.customize_description ?? draftCustomize
      const nextDesc = nextCustomize ? (payload.desc ?? draftDesc.trim()) : ''

      queryClient.setQueryData<Notebook>(['notebook', notebookId], (prev) =>
        prev
          ? {
              ...prev,
              name: nextName,
              desc: nextDesc,
              flags: {
                ...prev.flags,
                customize_description: nextCustomize,
              },
            }
          : prev,
      )
      // 首页列表与详情缓存分离；改名/自定义后让列表回到时拿到新 name/desc。
      void queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
      onSaved({
        name: nextName,
        desc: nextDesc,
        customizeDescription: nextCustomize,
      })
      onClose()
    },
    onError: (error) => {
      setErrorMessage(resolveSaveErrorMessage(error, t))
    },
  })

  const isBusy = saveMutation.isPending

  /** 封面变化同步详情缓存 + 作废首页列表（卡片背景用 cover_url），并回传页面。 */
  const applyCoverToCaches = (nextCoverUrl: string | null) => {
    queryClient.setQueryData<Notebook>(['notebook', notebookId], (prev) =>
      prev ? { ...prev, cover_url: nextCoverUrl ?? undefined } : prev,
    )
    void queryClient.invalidateQueries({ queryKey: ['notebooks', 'home'] })
    onCoverChange?.(nextCoverUrl)
  }

  const uploadCoverMutation = useMutation({
    mutationFn: async (file: File) => {
      const processed = await preprocessCoverFile(file)
      return uploadNotebookCoverImage(notebookId, processed)
    },
    onSuccess: (nextCoverUrl) => {
      setDraftCoverUrl(nextCoverUrl)
      applyCoverToCaches(nextCoverUrl)
    },
    onError: (error) => {
      // 封面操作是即时动作：失败走全局 toast，不占用对话框内的表单错误区。
      showAppToast({ message: resolveCoverOperationError(error, 'upload', t) })
    },
  })

  const deleteCoverMutation = useMutation({
    mutationFn: () => deleteNotebookCover(notebookId),
    onSuccess: () => {
      setDraftCoverUrl(null)
      applyCoverToCaches(null)
    },
    onError: (error) => {
      showAppToast({ message: resolveCoverOperationError(error, 'delete', t) })
    },
  })

  const coverBusy = uploadCoverMutation.isPending || deleteCoverMutation.isPending

  const handlePickCover = () => {
    if (coverBusy) {
      return
    }
    coverInputRef.current?.click()
  }

  const handleCoverSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // 先清空 value，允许重复选择同一个文件再次触发 onChange。
    event.target.value = ''
    if (!file) {
      return
    }
    const check = checkCoverFile(file)
    if (!check.ok) {
      showAppToast({ message: resolveCoverFileIssue(check.issue, t) })
      return
    }
    uploadCoverMutation.mutate(file)
  }

  const handleCustomizeToggle = (_: unknown, checked: boolean) => {
    setDraftCustomize(checked)
    setErrorMessage(null)
    if (checked && !draftDesc.trim() && description.trim()) {
      setDraftDesc(description)
    }
  }

  const handleDone = () => {
    if (isBusy) {
      return
    }

    const nextName = draftName.trim()
    if (!nextName) {
      setErrorMessage(t('workspace:customizeNotebook.name.errorRequired'))
      return
    }
    if (nextName.length > MAX_NAME_LENGTH) {
      setErrorMessage(t('workspace:customizeNotebook.name.errorTooLong'))
      return
    }

    const nextDesc = draftDesc.trim()
    if (draftCustomize && !nextDesc) {
      setErrorMessage(t('workspace:customizeNotebook.description.error.invalid'))
      return
    }

    const payload: UpdateNotebookRequest = {}
    if (nextName !== notebookName.trim()) {
      payload.name = nextName
    }

    const customizeChanged = draftCustomize !== customizeDescription
    const descChanged = draftCustomize && nextDesc !== description.trim()
    if (customizeChanged || descChanged) {
      if (draftCustomize) {
        payload.customize_description = true
        payload.desc = nextDesc
      } else {
        payload.customize_description = false
      }
    }

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    setErrorMessage(null)
    saveMutation.mutate(payload)
  }

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
    >
      <DialogTitle>{t('workspace:customizeNotebook.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
          {/* 封面：16:9 预留空间；无封面时没有图片，但组件仍要撑开占位。 */}
          <Box
            data-testid="customize-notebook-cover"
            data-busy={coverBusy ? 'true' : undefined}
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: workspaceRadius.lg,
              overflow: 'hidden',
              border: draftCoverUrl ? 'none' : '1px dashed',
              borderColor: 'divider',
              bgcolor: draftCoverUrl ? 'common.black' : 'action.hover',
              // 有封面时操作层静止隐藏；hover / 键盘 focus / 操作进行中显形，触屏（无 hover）常驻。
              ...(draftCoverUrl
                ? {
                    '& .cover-overlay': {
                      opacity: 0,
                      transition: workspaceTransitionPresets.opacityOnly,
                    },
                    '&:hover .cover-overlay, &:focus-within .cover-overlay, &[data-busy="true"] .cover-overlay': {
                      opacity: 1,
                    },
                    '@media (hover: none)': {
                      '& .cover-overlay': { opacity: 1 },
                    },
                  }
                : {}),
            }}
          >
            {draftCoverUrl ? (
              <>
                <Box
                  component="img"
                  src={draftCoverUrl}
                  alt={t('workspace:customizeNotebook.cover.alt')}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                {/* hover 遮罩：让白色图标在任意封面上都可读，同时静止时不打扰画面。 */}
                <Box
                  aria-hidden
                  className="cover-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: (theme) => alpha(theme.palette.common.black, 0.38),
                  }}
                />
              </>
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Stack spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
                  <Button
                    data-testid="customize-notebook-cover-upload"
                    variant="contained"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    onClick={handlePickCover}
                    disabled={coverBusy}
                  >
                    {coverBusy
                      ? t('workspace:customizeNotebook.cover.uploading')
                      : t('workspace:customizeNotebook.cover.uploadNew')}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {t('workspace:customizeNotebook.cover.formatHint')}
                  </Typography>
                </Stack>
              </Box>
            )}

            {draftCoverUrl ? (
              <>
                <IconButton
                  className="cover-overlay"
                  data-testid="customize-notebook-cover-delete"
                  aria-label={t('workspace:customizeNotebook.cover.deleteAria')}
                  onClick={() => deleteCoverMutation.mutate()}
                  disabled={coverBusy}
                  sx={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    color: 'common.white',
                    ':hover': {
                      bgcolor: (theme) => alpha(theme.palette.common.white, 0.16),
                    },
                  }}
                >
                  <DeleteOutlinedIcon sx={coverOverlayIconSx} />
                </IconButton>
                <IconButton
                  className="cover-overlay"
                  data-testid="customize-notebook-cover-upload"
                  aria-label={t('workspace:customizeNotebook.cover.uploadNew')}
                  onClick={handlePickCover}
                  disabled={coverBusy}
                  sx={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    color: 'common.white',
                    ':hover': {
                      bgcolor: (theme) => alpha(theme.palette.common.white, 0.16),
                    },
                  }}
                >
                  <UploadOutlinedIcon sx={coverOverlayIconSx} />
                </IconButton>
              </>
            ) : null}

            {coverBusy && draftCoverUrl ? (
              <CircularProgress
                size={22}
                aria-label={t('workspace:customizeNotebook.cover.uploading')}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  mt: '-11px',
                  ml: '-11px',
                  color: (theme) => theme.palette.common.white,
                }}
              />
            ) : null}
          </Box>
          {/* 隐藏的文件选择入口：格式（jpg/png/webp）与 2MB 上限在前端直接拒绝。 */}
          <input
            ref={coverInputRef}
            type="file"
            accept={COVER_INPUT_ACCEPT}
            disabled={coverBusy}
            onChange={handleCoverSelected}
            style={{ display: 'none' }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('workspace:customizeNotebook.name.label')}
            </Typography>
            <TextField
              data-testid="customize-notebook-name-input"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value.slice(0, MAX_NAME_LENGTH))}
              fullWidth
              disabled={isBusy}
              placeholder={t('workspace:customizeNotebook.name.placeholder')}
              slotProps={{
                htmlInput: {
                  maxLength: MAX_NAME_LENGTH,
                  'aria-label': t('workspace:customizeNotebook.name.label'),
                },
              }}
              sx={{ mt: workspaceDialogLayout.controlMt }}
            />
          </Box>

          <Box>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              spacing={workspaceSpace.sm}
            >
              <Stack
                direction="row"
                spacing={workspaceSpace.sm}
                sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}
              >
                <NotesRoundedIcon
                  sx={{ fontSize: workspaceIconSize.md, color: 'text.secondary', flexShrink: 0 }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                  {t('workspace:customizeNotebook.description.sectionTitle')}
                </Typography>
              </Stack>
              <Switch
                data-testid="customize-notebook-description-switch"
                color="primary"
                edge="end"
                checked={draftCustomize}
                onChange={handleCustomizeToggle}
                disabled={isBusy}
                slotProps={{
                  input: {
                    'aria-label': t('workspace:customizeNotebook.description.switchAria'),
                  },
                }}
                sx={{ flexShrink: 0 }}
              />
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: workspaceDialogLayout.helperTextMt }}
            >
              {t('workspace:customizeNotebook.description.help')}
            </Typography>
            {draftCustomize ? (
              <TextField
                data-testid="customize-notebook-description-input"
                value={draftDesc}
                onChange={(event) =>
                  setDraftDesc(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
                }
                multiline
                minRows={4}
                maxRows={10}
                fullWidth
                disabled={isBusy}
                placeholder={t('workspace:customizeNotebook.description.placeholder')}
                helperText={t('workspace:customizeNotebook.description.counter', {
                  count: draftDesc.length,
                  max: MAX_DESCRIPTION_LENGTH,
                })}
                sx={{ mt: workspaceDialogLayout.controlMt }}
              />
            ) : null}
          </Box>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: workspaceDialogLayout.contentPaddingX,
          py: workspaceSpace.md,
          gap: workspaceDialogLayout.actionsGap,
        }}
      >
        <Button
          data-testid="customize-notebook-done"
          variant="contained"
          disabled={isBusy}
          onClick={handleDone}
          sx={{ ml: 'auto' }}
        >
          {isBusy
            ? t('workspace:customizeNotebook.saving')
            : t('workspace:customizeNotebook.done')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function resolveSaveErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof ApiError) {
    if (error.code === 100002) {
      return t('workspace:customizeNotebook.name.errorInvalid')
    }
    if (error.code === 100003) {
      return t('workspace:customizeNotebook.description.error.invalid')
    }
  }
  return t('workspace:customizeNotebook.error.saveFailed')
}

function resolveCoverFileIssue(
  issue: CoverFileIssue,
  t: (key: string) => string,
): string {
  return issue === 'unsupportedType'
    ? t('workspace:customizeNotebook.cover.error.unsupportedType')
    : t('workspace:customizeNotebook.cover.error.tooLarge')
}

function resolveCoverOperationError(
  error: unknown,
  operation: 'upload' | 'delete',
  t: (key: string) => string,
): string {
  if (error instanceof CoverImageValidationError) {
    return resolveCoverFileIssue(error.issue, t)
  }
  if (error instanceof CoverProcessError) {
    return t('workspace:customizeNotebook.cover.error.processFailed')
  }
  if (error instanceof ApiError && error.code === 100016) {
    return t('workspace:customizeNotebook.cover.error.invalid')
  }
  return t(
    operation === 'upload'
      ? 'workspace:customizeNotebook.cover.error.uploadFailed'
      : 'workspace:customizeNotebook.cover.error.deleteFailed',
  )
}
