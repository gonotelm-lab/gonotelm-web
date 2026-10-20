import { useMemo, useState, type KeyboardEvent } from 'react'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  deleteNotebookMember,
  getNotebookSharing,
  updateNotebookVisibility,
  upsertNotebookMember,
} from '../../../api/notebook'
import { ApiError } from '../../../lib/http'
import type {
  GetNotebookSharingResponse,
  NotebookMemberRole,
  NotebookVisibility,
} from '../../../types/api'
import { useMeQuery } from '../../auth/useMeQuery'
import { useNotebookAccessQuery } from '../hooks/useNotebookAccessQuery'
import { workspaceDialogLayout } from '../shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../shared/ui/layoutTokens'
import { workspaceIconSize, workspaceType } from '../shared/ui/typeTokens'

interface NotebookSharingDialogProps {
  notebookId: string
  notebookName: string
  open: boolean
  onClose: () => void
}

interface DraftMember {
  /** 已存在成员用 user_id；尚未保存的新成员用 email 生成的临时 key。 */
  key: string
  userId: string | null
  email: string
  nickname: string
  avatarUrl: string
  role: NotebookMemberRole
}

interface SharingDraft {
  visibility: NotebookVisibility
  members: DraftMember[]
}

const sharingQueryKey = (notebookId: string) => ['notebook-sharing', notebookId] as const

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const toDraft = (data: GetNotebookSharingResponse): SharingDraft => ({
  visibility: data.visibility,
  members: data.members.map((member) => ({
    key: member.user_id,
    userId: member.user_id,
    email: member.email,
    nickname: member.nickname,
    avatarUrl: member.avatar_url,
    role: member.role,
  })),
})

const memberDisplayName = (member: DraftMember) =>
  member.nickname.trim() || member.email

const hasSharingChanges = (
  draft: SharingDraft,
  serverDraft: SharingDraft,
) => {
  if (draft.visibility !== serverDraft.visibility) {
    return true
  }
  if (draft.members.length !== serverDraft.members.length) {
    return true
  }
  const serverRoles = new Map(
    serverDraft.members.map((member) => [member.key, member.role]),
  )
  return draft.members.some(
    (member) => serverRoles.get(member.key) !== member.role,
  )
}

/**
 * 把输入框里的邮箱追加到草稿。
 * 回车添加和保存按钮共用这段逻辑，避免“输入了邮箱但没按回车，保存按钮仍不可用”。
 */
const appendDraftMember = (
  draft: SharingDraft,
  rawEmail: string,
  ownerEmail: string,
): { nextDraft: SharingDraft; error: string | null } => {
  const email = rawEmail.trim()
  if (!emailPattern.test(email)) {
    return { nextDraft: draft, error: 'sharing.error.invalidEmail' }
  }

  const normalizedEmail = email.toLowerCase()
  const sameEmail = (value: string) => value.toLowerCase() === normalizedEmail
  if (ownerEmail && sameEmail(ownerEmail)) {
    return { nextDraft: draft, error: 'sharing.error.cannotShareWithOwner' }
  }
  if (draft.members.some((member) => sameEmail(member.email))) {
    return { nextDraft: draft, error: 'sharing.error.memberExists' }
  }

  return {
    nextDraft: {
      ...draft,
      members: [
        ...draft.members,
        {
          key: `new:${normalizedEmail}`,
          userId: null,
          email,
          nickname: '',
          avatarUrl: '',
          role: 'viewer',
        },
      ],
    },
    error: null,
  }
}

/** 后端把“用户不存在 / 被禁 / 分享给自己”拆成了独立错误码，这里转成可读文案。 */
const resolveSharingError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.code === 100010) return 'sharing.error.userNotFound'
    if (error.code === 100011) return 'sharing.error.userBanned'
    if (error.code === 100008) return 'sharing.error.cannotShareWithOwner'
    if (error.status === 403) return 'sharing.error.noPermission'
  }
  return 'sharing.error.updateFailed'
}

/**
 * 对话框内容骨架：先把结构占住，接口回来后再替换成真实成员列表。
 * 这样点击分享立刻有反馈，不会因为等待 access + sharing 两个串行请求而显得卡住。
 */
function SharingDialogSkeleton() {
  return (
    <Stack
      spacing={workspaceSpace.lg}
      data-testid="sharing-dialog-skeleton"
      aria-busy="true"
    >
      <Skeleton
        variant="rounded"
        height={56}
        sx={{ borderRadius: workspaceRadius.lg }}
      />

      <Box>
        <Skeleton variant="text" width={112} height={24} />
        <Stack
          direction="row"
          spacing={workspaceSpace.sm}
          sx={{ alignItems: 'center', mt: workspaceSpace.sm }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="42%" />
            <Skeleton variant="text" width="60%" height={16} />
          </Box>
          <Skeleton variant="text" width={40} />
        </Stack>

        {[0, 1].map((index) => (
          <Stack
            key={index}
            direction="row"
            spacing={workspaceSpace.sm}
            sx={{ py: workspaceSpace.sm, alignItems: 'center' }}
          >
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="38%" />
              <Skeleton variant="text" width="52%" height={16} />
            </Box>
            <Skeleton
              variant="rounded"
              width={96}
              height={36}
              sx={{ borderRadius: workspaceRadius.md }}
            />
            <Skeleton variant="circular" width={32} height={32} />
          </Stack>
        ))}
      </Box>

      <Divider />

      <Box>
        <Skeleton variant="text" width={80} height={24} />
        <Skeleton
          variant="rounded"
          height={64}
          sx={{ mt: workspaceSpace.sm, borderRadius: workspaceRadius.lg }}
        />
      </Box>
    </Stack>
  )
}

export function NotebookSharingDialog({
  notebookId,
  notebookName,
  open,
  onClose,
}: NotebookSharingDialogProps) {
  const { t } = useTranslation(['workspace', 'common'])
  const queryClient = useQueryClient()
  const meQuery = useMeQuery()
  const [draftOverride, setDraftOverride] = useState<SharingDraft | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [addMemberError, setAddMemberError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [visibilityMenuAnchorEl, setVisibilityMenuAnchorEl] =
    useState<HTMLElement | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const sharingKey = useMemo(() => sharingQueryKey(notebookId), [notebookId])

  // 复用页面顶栏已经取过的 access；只有不存在缓存时才会真正发请求。
  const accessQuery = useNotebookAccessQuery(notebookId, open)

  const canManageSharing = accessQuery.data?.can_manage_sharing ?? false

  const sharingQuery = useQuery({
    queryKey: sharingKey,
    queryFn: () => getNotebookSharing(notebookId),
    enabled: open && Boolean(notebookId) && canManageSharing,
  })

  const sharing = sharingQuery.data
  const isSharingLoading =
    Boolean(notebookId) &&
    (accessQuery.isPending || (canManageSharing && sharingQuery.isPending))
  const serverDraft = useMemo(() => (sharing ? toDraft(sharing) : null), [sharing])
  const draft = draftOverride ?? serverDraft

  const isDirty = useMemo(
    () => Boolean(draft && serverDraft && hasSharingChanges(draft, serverDraft)),
    [draft, serverDraft],
  )
  const hasPendingMemberEmail = newMemberEmail.trim().length > 0
  const canSave = Boolean(draft && serverDraft) && (isDirty || hasPendingMemberEmail)

  const owner = meQuery.data
  const ownerName = owner?.nickname?.trim() || owner?.email || ''
  const ownerEmail = owner?.email ?? ''

  const resetDrafts = () => {
    setDraftOverride(null)
    setNewMemberEmail('')
    setAddMemberError(null)
    setSaveError(null)
    setVisibilityMenuAnchorEl(null)
    setCopyState('idle')
  }

  const handleClose = () => {
    if (isSaving) {
      return
    }
    resetDrafts()
    onClose()
  }

  const updateDraft = (updater: (current: SharingDraft) => SharingDraft) => {
    if (!serverDraft) {
      return
    }
    setSaveError(null)
    setDraftOverride((previous) => updater(previous ?? serverDraft))
  }

  const handleAddMember = () => {
    if (!draft) {
      return
    }
    const { nextDraft, error } = appendDraftMember(
      draft,
      newMemberEmail,
      ownerEmail,
    )
    if (error) {
      setAddMemberError(error)
      return
    }

    setAddMemberError(null)
    setNewMemberEmail('')
    updateDraft(() => nextDraft)
  }

  const handleNewMemberKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    handleAddMember()
  }

  const handleMemberRoleChange = (memberKey: string, role: NotebookMemberRole) => {
    updateDraft((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.key === memberKey ? { ...member, role } : member,
      ),
    }))
  }

  const handleRemoveMember = (memberKey: string) => {
    updateDraft((current) => ({
      ...current,
      members: current.members.filter((member) => member.key !== memberKey),
    }))
  }

  const handleVisibilitySelect = (visibility: NotebookVisibility) => {
    setVisibilityMenuAnchorEl(null)
    updateDraft((current) => ({ ...current, visibility }))
  }

  const handleCopyLink = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      setCopyState('error')
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  const handleSave = async () => {
    if (!draft || !serverDraft || isSaving) {
      return
    }

    let nextDraft = draft
    if (hasPendingMemberEmail) {
      const { nextDraft: draftWithMember, error } = appendDraftMember(
        draft,
        newMemberEmail,
        ownerEmail,
      )
      if (error) {
        setAddMemberError(error)
        return
      }
      nextDraft = draftWithMember
      setDraftOverride(draftWithMember)
      setNewMemberEmail('')
      setAddMemberError(null)
    }

    if (!hasSharingChanges(nextDraft, serverDraft)) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      if (nextDraft.visibility !== serverDraft.visibility) {
        await updateNotebookVisibility(notebookId, nextDraft.visibility)
      }

      // 先删再增/改：同一邮箱先被移除又被重新添加时，顺序不会互相覆盖。
      for (const original of serverDraft.members) {
        if (
          original.userId &&
          !nextDraft.members.some((member) => member.userId === original.userId)
        ) {
          await deleteNotebookMember(notebookId, original.userId)
        }
      }

      for (const member of nextDraft.members) {
        const original = serverDraft.members.find(
          (candidate) => candidate.key === member.key,
        )
        if (!original || original.role !== member.role) {
          await upsertNotebookMember(notebookId, {
            email: member.email,
            role: member.role,
          })
        }
      }

      await queryClient.invalidateQueries({ queryKey: sharingKey })
      setIsSaving(false)
      handleClose()
    } catch (error) {
      setSaveError(resolveSharingError(error))
      setIsSaving(false)
      void queryClient.invalidateQueries({ queryKey: sharingKey })
    }
  }

  const renderContent = () => {
    if (!notebookId) {
      return (
        <Alert severity="error">{t('workspace:sharing.error.loadFailed')}</Alert>
      )
    }

    if (isSharingLoading) {
      return <SharingDialogSkeleton />
    }

    if (accessQuery.isError) {
      return (
        <Alert severity="error">{t('workspace:sharing.error.loadFailed')}</Alert>
      )
    }

    if (!canManageSharing) {
      return (
        <Alert severity="info">
          {t('workspace:sharing.error.noPermission')}
        </Alert>
      )
    }

    if (sharingQuery.isError || !draft) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void sharingQuery.refetch()}
            >
              {t('common:action.retry')}
            </Button>
          }
        >
          {t('workspace:sharing.error.loadFailed')}
        </Alert>
      )
    }

    const isRestricted = draft.visibility === 'restricted'

    return (
      <Stack spacing={workspaceSpace.lg}>
        <TextField
          fullWidth
          type="email"
          autoComplete="email"
          value={newMemberEmail}
          placeholder={t('workspace:sharing.add.placeholder')}
          disabled={isSaving}
          onChange={(event) => {
            setNewMemberEmail(event.target.value)
            if (addMemberError) {
              setAddMemberError(null)
            }
          }}
          error={Boolean(addMemberError)}
          helperText={
            addMemberError ? t(`workspace:${addMemberError}`) : undefined
          }
          slotProps={{
            htmlInput: {
              'data-testid': 'sharing-add-member-input',
              'aria-label': t('workspace:sharing.add.placeholder'),
              onKeyDown: handleNewMemberKeyDown,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: workspaceRadius.lg,
            },
          }}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t('workspace:sharing.members.title')}
          </Typography>

          <Stack
            direction="row"
            spacing={workspaceSpace.sm}
            sx={{ alignItems: 'center', mt: workspaceSpace.sm }}
          >
            <Avatar
              src={owner?.avatar_url || undefined}
              alt=""
              sx={{
                width: 40,
                height: 40,
                fontSize: workspaceType.sm,
                bgcolor: 'action.selected',
                color: 'text.secondary',
              }}
            >
              {Array.from(ownerName)[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {ownerName}
              </Typography>
              {ownerEmail ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  noWrap
                >
                  {ownerEmail}
                </Typography>
              ) : null}
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {t('workspace:sharing.role.owner')}
            </Typography>
          </Stack>

          {draft.members.length > 0 ? (
            <Stack
              divider={<Divider flexItem />}
              sx={{ mt: workspaceSpace.sm }}
            >
              {draft.members.map((member) => {
                const displayName = memberDisplayName(member)
                return (
                  <Stack
                    key={member.key}
                    data-testid={`sharing-member-${member.key}`}
                    direction="row"
                    spacing={workspaceSpace.sm}
                    sx={{ py: workspaceSpace.sm, alignItems: 'center' }}
                  >
                    <Avatar
                      src={member.avatarUrl || undefined}
                      alt=""
                      sx={{
                        width: 40,
                        height: 40,
                        fontSize: workspaceType.sm,
                        bgcolor: 'action.selected',
                        color: 'text.secondary',
                      }}
                    >
                      {Array.from(displayName)[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {displayName}
                      </Typography>
                      {member.nickname.trim() ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          noWrap
                        >
                          {member.email}
                        </Typography>
                      ) : null}
                    </Box>
                    <Select
                      size="small"
                      data-testid={`sharing-member-role-${member.key}`}
                      value={member.role}
                      disabled={isSaving}
                      aria-label={t('workspace:sharing.role.aria', {
                        name: displayName,
                      })}
                      onChange={(event) =>
                        handleMemberRoleChange(
                          member.key,
                          event.target.value as NotebookMemberRole,
                        )
                      }
                      sx={{
                        height: 36,
                        minWidth: 96,
                        borderRadius: workspaceRadius.md,
                        fontSize: workspaceType.sm,
                        flexShrink: 0,
                      }}
                    >
                      <MenuItem value="viewer">
                        {t('workspace:sharing.role.viewer')}
                      </MenuItem>
                      <MenuItem value="collaborator">
                        {t('workspace:sharing.role.collaborator')}
                      </MenuItem>
                    </Select>
                    <IconButton
                      size="small"
                      data-testid={`sharing-member-remove-${member.key}`}
                      disabled={isSaving}
                      aria-label={t('workspace:sharing.members.removeAria', {
                        name: displayName,
                      })}
                      onClick={() => handleRemoveMember(member.key)}
                      sx={{ width: 32, height: 32, flexShrink: 0 }}
                    >
                      <DeleteOutlineRoundedIcon
                        sx={{ fontSize: workspaceIconSize.md }}
                      />
                    </IconButton>
                  </Stack>
                )
              })}
            </Stack>
          ) : null}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t('workspace:sharing.visibility.label')}
          </Typography>
          <Box
            component="button"
            type="button"
            data-testid="sharing-visibility-trigger"
            onClick={(event) =>
              setVisibilityMenuAnchorEl(event.currentTarget)
            }
            disabled={isSaving}
            sx={{
              mt: workspaceSpace.sm,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: workspaceSpace.sm,
              p: workspaceSpace.sm,
              border: 1,
              borderColor: 'divider',
              borderRadius: workspaceRadius.lg,
              bgcolor: 'transparent',
              color: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              '&:hover': {
                bgcolor: 'action.hover',
              },
              '&:disabled': {
                cursor: 'default',
                opacity: 0.7,
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: 'action.selected',
                color: 'text.secondary',
              }}
            >
              {isRestricted ? (
                <LockOutlinedIcon sx={{ fontSize: workspaceIconSize.lg }} />
              ) : (
                <PublicOutlinedIcon sx={{ fontSize: workspaceIconSize.lg }} />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2">
                {t(
                  isRestricted
                    ? 'workspace:sharing.visibility.restricted'
                    : 'workspace:sharing.visibility.public',
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t(
                  isRestricted
                    ? 'workspace:sharing.visibility.restrictedHint'
                    : 'workspace:sharing.visibility.publicHint',
                )}
              </Typography>
            </Box>
            <ExpandMoreRoundedIcon
              sx={{
                fontSize: workspaceIconSize.lg,
                color: 'text.secondary',
                flexShrink: 0,
              }}
            />
          </Box>
          <Menu
            anchorEl={visibilityMenuAnchorEl}
            open={Boolean(visibilityMenuAnchorEl)}
            onClose={() => setVisibilityMenuAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
              paper: {
                sx: { minWidth: 340, mt: workspaceSpace.xxs },
              },
            }}
          >
            <MenuItem
              data-testid="sharing-visibility-option-restricted"
              selected={isRestricted}
              onClick={() => handleVisibilitySelect('restricted')}
              sx={{
                alignItems: 'flex-start',
                gap: workspaceSpace.sm,
                py: workspaceSpace.sm,
              }}
            >
              <LockOutlinedIcon
                sx={{ fontSize: workspaceIconSize.lg, mt: 0.25 }}
              />
              <Box>
                <Typography variant="body2">
                  {t('workspace:sharing.visibility.restricted')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('workspace:sharing.visibility.restrictedHint')}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem
              data-testid="sharing-visibility-option-public"
              selected={!isRestricted}
              onClick={() => handleVisibilitySelect('public')}
              sx={{
                alignItems: 'flex-start',
                gap: workspaceSpace.sm,
                py: workspaceSpace.sm,
              }}
            >
              <PublicOutlinedIcon
                sx={{ fontSize: workspaceIconSize.lg, mt: 0.25 }}
              />
              <Box>
                <Typography variant="body2">
                  {t('workspace:sharing.visibility.public')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('workspace:sharing.visibility.publicHint')}
                </Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Box>

        {saveError ? (
          <Alert severity="error">{t(`workspace:${saveError}`)}</Alert>
        ) : null}
      </Stack>
    )
  }

  const canRenderFooter =
    Boolean(notebookId) && canManageSharing && Boolean(draft)
  const showFooterSkeleton = isSharingLoading

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : handleClose}
      fullWidth
      maxWidth="sm"
      data-testid="sharing-dialog"
      slotProps={{
        paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: workspaceSpace.sm,
          pr: workspaceSpace.sm,
        }}
      >
        <IosShareOutlinedIcon
          sx={{ fontSize: workspaceIconSize.lg, flexShrink: 0 }}
        />
        <Typography
          component="span"
          variant="subtitle1"
          sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}
          noWrap
        >
          {notebookName.trim()
            ? t('workspace:sharing.titleWithName', { name: notebookName })
            : t('workspace:sharing.title')}
        </Typography>
        <IconButton
          size="small"
          aria-label={t('common:action.close')}
          onClick={handleClose}
          disabled={isSaving}
        >
          <CloseRoundedIcon sx={{ fontSize: workspaceIconSize.lg }} />
        </IconButton>
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      {canRenderFooter ? (
        <DialogActions
          sx={{
            px: workspaceDialogLayout.contentPaddingX,
            pb: workspaceSpace.lg,
            pt: workspaceSpace.sm,
            justifyContent: 'space-between',
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={
              <LinkRoundedIcon sx={{ fontSize: workspaceIconSize.sm }} />
            }
            onClick={() => void handleCopyLink()}
            disabled={isSaving}
          >
            {copyState === 'copied'
              ? t('workspace:sharing.link.copied')
              : copyState === 'error'
                ? t('workspace:sharing.link.copyFailed')
                : t('workspace:sharing.link.copy')}
          </Button>
          <Button
            variant="contained"
            data-testid="sharing-save"
            onClick={() => void handleSave()}
            disabled={!canSave || isSaving}
          >
            {isSaving ? t('common:action.saving') : t('common:action.save')}
          </Button>
        </DialogActions>
      ) : showFooterSkeleton ? (
        <DialogActions
          data-testid="sharing-dialog-footer-skeleton"
          sx={{
            px: workspaceDialogLayout.contentPaddingX,
            pb: workspaceSpace.lg,
            pt: workspaceSpace.sm,
            justifyContent: 'space-between',
          }}
        >
          <Skeleton variant="rounded" width={140} height={32} />
          <Skeleton variant="rounded" width={88} height={32} />
        </DialogActions>
      ) : null}
    </Dialog>
  )
}
