import { useRef, useState } from 'react'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import { Alert, Avatar, Box, Button, ButtonBase, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { updateMe, uploadAvatar } from '../../api/user'
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  validateAvatarFile,
  type AvatarCanvasFactory,
  type AvatarImageFactory,
  type AvatarImageError,
} from '../../lib/avatarImage'
import type { MeResponse } from '../../types/api'
import { ME_QUERY_KEY, useMeQuery } from '../auth/useMeQuery'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceTransitionPresets } from '../notebook-workspace/shared/ui/motionTokens'
import { workspaceIconSize } from '../notebook-workspace/shared/ui/typeTokens'
import { AvatarCropDialog } from './AvatarCropDialog'

/** Mirrors backend `identityentity.MaxUserNickNameRune`. */
export const NICKNAME_MAX_RUNES = 255

interface ProfileSettingsSectionProps {
  /** 画布工厂接缝，仅用于在没有 DOM 的测试环境注入替身。 */
  createCanvas?: AvatarCanvasFactory
  createImage?: AvatarImageFactory
}

const countRunes = (value: string) => Array.from(value).length

export function ProfileSettingsSection({ createCanvas, createImage }: ProfileSettingsSectionProps = {}) {
  const { t } = useTranslation(['settings', 'common'])
  const queryClient = useQueryClient()
  const meQuery = useMeQuery()

  const savedNickname = meQuery.data?.nickname ?? ''
  const avatarUrl = meQuery.data?.avatar_url?.trim() || undefined

  // null 表示「未编辑」：始终显示服务端值，避免用 effect 反向同步草稿。
  const [draftNickname, setDraftNickname] = useState<string | null>(null)
  const [isTouched, setIsTouched] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (nickname: string) => updateMe({ nickname }),
    onSuccess: (_data, nickname) => {
      setDraftNickname(null)
      setShowSaved(true)
      setIsTouched(false)
      // 先落缓存让账号菜单/头像立刻同步，再后台校准服务端真值。
      queryClient.setQueryData<MeResponse>(ME_QUERY_KEY, (previous) =>
        previous ? { ...previous, nickname } : previous,
      )
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
    },
  })

  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  // 待裁剪的原图；非空即代表裁剪对话框打开。
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState<string>('')
  const [showAvatarSaved, setShowAvatarSaved] = useState(false)

  const avatarMutation = useMutation({
    mutationFn: (blob: Blob) => uploadAvatar(blob, 'avatar.jpg'),
    onSuccess: (data) => {
      setPendingImage(null)
      setShowAvatarSaved(true)
      const nextUrl = data?.avatar_url?.trim()
      if (nextUrl) {
        queryClient.setQueryData<MeResponse>(ME_QUERY_KEY, (previous) =>
          previous ? { ...previous, avatar_url: nextUrl } : previous,
        )
      }
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
    },
  })

  const describeAvatarError = (error: AvatarImageError): string => {
    switch (error.code) {
      case 'unsupported-format':
        return t('settings:avatar.unsupportedFormat')
      case 'empty':
        return t('settings:avatar.empty')
      case 'too-large':
        return t('settings:avatar.tooLarge', {
          max: Math.round(AVATAR_MAX_BYTES / (1024 * 1024)),
        })
      default:
        return t('settings:avatar.decodeFailed')
    }
  }

  const handleAvatarPicked = async (file: File) => {
    setShowAvatarSaved(false)
    setAvatarError('')
    try {
      const error = await validateAvatarFile(file)
      if (error) {
        setAvatarError(describeAvatarError(error))
        return
      }
      // 通过校验才进入裁剪，避免为超限图片做无谓的解码与绘制。
      setPendingImage(file)
    } catch {
      setAvatarError(t('settings:avatar.readFailed'))
    }
  }

  const isAvatarBusy = avatarMutation.isPending

  /** 按钮与头像本身共用同一个文件选择入口。 */
  const openFilePicker = () => avatarInputRef.current?.click()

  const nicknameValue = draftNickname ?? savedNickname
  const trimmedNickname = nicknameValue.trim()
  const runeCount = countRunes(trimmedNickname)
  const isEmpty = runeCount === 0
  const isTooLong = runeCount > NICKNAME_MAX_RUNES
  const isUnchanged = trimmedNickname === savedNickname.trim()
  const canSave = !isEmpty && !isTooLong && !isUnchanged && !updateMutation.isPending
  const showError = isTooLong || (isTouched && isEmpty)

  const fallbackInitial = Array.from(savedNickname.trim())[0]?.toUpperCase() ?? ''

  const handleNicknameChange = (value: string) => {
    setShowSaved(false)
    setIsTouched(true)
    setDraftNickname(value)
  }

  const handleSave = () => {
    if (!canSave) {
      return
    }
    setShowSaved(false)
    updateMutation.mutate(trimmedNickname)
  }

  return (
    <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('settings:profile.title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: workspaceDialogLayout.helperTextMt }}
        >
          {t('settings:profile.subtitle')}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('settings:profile.avatarLabel')}
        </Typography>
        <Stack
          direction="row"
          spacing={workspaceSpace.md}
          sx={{ mt: workspaceDialogLayout.controlMt, alignItems: 'center' }}
        >
          {/* 头像本身也是上传入口，与右侧按钮等效。 */}
          <ButtonBase
            data-testid="profile-avatar-trigger"
            aria-label={avatarUrl ? t('settings:avatar.change') : t('settings:avatar.select')}
            disabled={isAvatarBusy}
            onClick={openFilePicker}
            sx={(theme) => ({
              position: 'relative',
              borderRadius: '50%',
              flexShrink: 0,
              '&:hover .avatar-edit-affordance': { opacity: 1 },
              '&.Mui-disabled': { opacity: 0.6 },
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            })}
          >
            <Avatar
              data-testid="profile-avatar"
              src={avatarUrl}
              alt=""
              sx={{ width: 56, height: 56 }}
            >
              {avatarUrl ? null : fallbackInitial}
            </Avatar>
            <Box
              className="avatar-edit-affordance"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.42)',
                color: '#fff',
                opacity: 0,
                transition: workspaceTransitionPresets.opacityOnly,
              }}
            >
              <PhotoCameraOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
            </Box>
          </ButtonBase>

          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
              <Button
                data-testid="profile-avatar-select"
                size="small"
                variant="outlined"
                disabled={isAvatarBusy}
                onClick={openFilePicker}
              >
                {isAvatarBusy
                  ? t('settings:avatar.uploading')
                  : avatarUrl
                    ? t('settings:avatar.change')
                    : t('settings:avatar.select')}
              </Button>
              {showAvatarSaved ? (
                <Typography
                  data-testid="profile-avatar-saved"
                  role="status"
                  variant="caption"
                  color="success.main"
                >
                  {t('settings:avatar.updated')}
                </Typography>
              ) : null}
            </Stack>
            {/* 限制条件：灰色小字，一行说明格式/大小/尺寸。 */}
            <Typography
              data-testid="profile-avatar-constraints"
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: workspaceSpace.xxs }}
            >
              {t('settings:profile.avatarConstraints')}
            </Typography>
          </Box>
        </Stack>

        <input
          ref={avatarInputRef}
          hidden
          type="file"
          accept={AVATAR_ACCEPT}
          data-testid="profile-avatar-input"
          aria-label={t('settings:avatar.select')}
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            if (file) {
              void handleAvatarPicked(file)
            }
            // 允许连续选择同一文件。
            if (input) {
              input.value = ''
            }
          }}
        />

        {avatarError ? (
          <Alert severity="error" sx={{ mt: workspaceSpace.sm }}>
            <span data-testid="profile-avatar-error">{avatarError}</span>
          </Alert>
        ) : null}

        {avatarMutation.isError ? (
          <Alert
            data-testid="profile-avatar-upload-error"
            severity="error"
            sx={{ mt: workspaceSpace.sm }}
          >
            {t('settings:avatar.uploadFailed')}
          </Alert>
        ) : null}
      </Box>

      <TextField
        fullWidth
        size="small"
        label={t('settings:profile.nicknameLabel')}
        value={nicknameValue}
        onChange={(event) => handleNicknameChange(event.target.value)}
        disabled={updateMutation.isPending}
        error={showError}
        helperText={
          isTooLong
            ? t('settings:profile.nicknameTooLong', { max: NICKNAME_MAX_RUNES })
            : isEmpty
              ? t('settings:profile.nicknameRequired')
              : t('settings:profile.nicknameCount', { count: runeCount, max: NICKNAME_MAX_RUNES })
        }
        slotProps={{ htmlInput: { 'data-testid': 'profile-nickname-input' } }}
      />

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('settings:profile.userIdLabel')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: workspaceDialogLayout.helperTextMt, wordBreak: 'break-all' }}
        >
          <span data-testid="profile-user-id">{meQuery.data?.user_id ?? '—'}</span>
        </Typography>
      </Box>

      {updateMutation.isError ? (
        <Alert data-testid="profile-save-error" severity="error">
          {t('settings:profile.saveFailed')}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={workspaceDialogLayout.actionsGap} sx={{ alignItems: 'center' }}>
        <Button
          data-testid="profile-save"
          variant="contained"
          disabled={!canSave}
          onClick={handleSave}
        >
          {updateMutation.isPending ? t('common:action.saving') : t('common:action.save')}
        </Button>
        {showSaved ? (
          <Typography
            data-testid="profile-saved"
            role="status"
            variant="caption"
            color="success.main"
          >
            {t('settings:profile.saved')}
          </Typography>
        ) : null}
      </Stack>

      {pendingImage ? (
        <AvatarCropDialog
          open
          file={pendingImage}
          createCanvas={createCanvas}
          createImage={createImage}
          onCancel={() => setPendingImage(null)}
          onConfirm={(blob) => {
            setAvatarError('')
            avatarMutation.mutateAsync(blob).catch(() => {
              // 失败时保留裁剪结果，让用户可以直接重试上传。
            })
          }}
        />
      ) : null}
    </Stack>
  )
}
