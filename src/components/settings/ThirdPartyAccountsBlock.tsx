import { Fragment, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { TFunction } from 'i18next'
import {
  getAuthIdentities,
  getAuthSupportedIdentities,
  IdentityBindRedirectError,
  startIdentityBind,
  unbindIdentity,
} from '../../api/auth'
import type { AuthIdentity } from '../../types/api'
import { ProviderIcon } from '../auth/ProviderIcon'
import { useMeQuery } from '../auth/useMeQuery'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../notebook-workspace/shared/ui/typeTokens'

const AUTH_IDENTITIES_QUERY_KEY = ['auth', 'identities'] as const
const AUTH_SUPPORTED_IDENTITIES_QUERY_KEY = ['auth', 'supported-identities'] as const

/** provider 名走 `auth:provider.*`，未知名字直接显示原名。 */
function providerLabel(provider: string, t: (key: string) => string): string {
  const known = t(`auth:provider.${provider}`)
  return known === `auth:provider.${provider}` ? provider : known
}

/** 绑定失败的文案：302 是「后端还没把授权地址放进响应体」，其余是通用失败。 */
function describeBindError(error: unknown, t: TFunction): string {
  if (error instanceof IdentityBindRedirectError) {
    return t('settings:security.identities.bindNeedsAuthorizeUrl')
  }
  return t('settings:security.identities.bindFailed')
}

function IdentityRow({
  provider,
  identity,
  isBinding,
  isUnbinding,
  onBind,
  onUnbind,
}: {
  provider: string
  identity?: AuthIdentity
  isBinding: boolean
  isUnbinding: boolean
  onBind: (provider: string) => void
  onUnbind: (identity: AuthIdentity) => void
}) {
  const { t } = useTranslation(['settings', 'auth'])
  const isBound = Boolean(identity)

  return (
    <Stack
      direction="row"
      spacing={workspaceSpace.md}
      sx={{ alignItems: 'center', px: workspaceSpace.md, py: workspaceSpace.sm, minHeight: 52 }}
    >
      <Box sx={{ display: 'flex', color: 'text.secondary' }}>
        <ProviderIcon name={provider} size={workspaceIconSize.md} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2">{providerLabel(provider, t)}</Typography>
        {identity?.provider_email ? (
          <Typography
            variant="caption"
            color="text.secondary"
            data-testid={`identity-email-${provider}`}
            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {identity.provider_email}
          </Typography>
        ) : null}
      </Box>

      {isBound ? (
        // 每行只有一个按钮：未绑定是「绑定」，已绑定是「解绑」，靠样式区分
        // （同款同尺寸，已绑定弱化成中性色、悬停转危险色）。两行右侧天然对齐。
        <Button
          data-testid={`identity-unbind-${provider}`}
          size="small"
          variant="outlined"
          disabled={isUnbinding}
          onClick={() => onUnbind(identity!)}
          sx={{
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': { color: 'error.main', borderColor: 'error.main' },
          }}
        >
          {isUnbinding
            ? t('settings:security.identities.unbinding')
            : t('settings:security.identities.unbind')}
        </Button>
      ) : (
        // 未绑定行只留一个动作按钮：状态与动作合成同一个控件，不再并排显示
        // 「未绑定」+「绑定」两段文案。
        <Button
          data-testid={`identity-bind-${provider}`}
          size="small"
          variant="outlined"
          disabled={isBinding}
          aria-label={t('settings:security.identities.bindAria', {
            provider: providerLabel(provider, t),
          })}
          onClick={() => onBind(provider)}
        >
          {isBinding
            ? t('settings:security.identities.binding')
            : t('settings:security.identities.bind')}
        </Button>
      )}
    </Stack>
  )
}

/**
 * 解绑的确认、保护与请求。
 *
 * 单独抽出来既是为了让组件本体只做接线，也是为了让「锁门」这条规则只有一个入口：
 * 解绑掉唯一登录方式且账号还没有口令，用户就再也进不来了——先挡住并提示设口令。
 */
function useIdentityUnbind(boundCount: number, hasPassword: boolean) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<AuthIdentity | null>(null)
  const [blocked, setBlocked] = useState(false)

  const mutation = useMutation({
    mutationFn: unbindIdentity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_IDENTITIES_QUERY_KEY })
      setPending(null)
    },
  })

  const request = (identity: AuthIdentity) => {
    if (boundCount <= 1 && !hasPassword) {
      setBlocked(true)
      return
    }
    setBlocked(false)
    setPending(identity)
  }

  return { pending, blocked, request, mutation, cancel: () => setPending(null) }
}

/**
 * 解绑的反馈与确认框。抽出来是为了让主组件只做接线（也把分支集中在一处）。
 */
function UnbindUi({
  unbind,
  t,
}: {
  unbind: ReturnType<typeof useIdentityUnbind>
  t: TFunction
}) {
  const provider = providerLabel(unbind.pending?.provider ?? unbind.mutation.variables?.provider ?? '', t)

  return (
    <>
      {unbind.blocked ? (
        <Alert data-testid="identity-unbind-blocked" severity="warning">
          {t('settings:security.identities.unbindLastMethod')}
        </Alert>
      ) : null}

      {unbind.mutation.isSuccess && !unbind.pending ? (
        <Typography
          data-testid="identity-unbind-done"
          role="status"
          variant="caption"
          color="success.main"
        >
          {t('settings:security.identities.unbindDone', { provider })}
        </Typography>
      ) : null}

      {unbind.mutation.isError ? (
        <Alert data-testid="identity-unbind-error" severity="error">
          {t('settings:security.identities.unbindFailed')}
        </Alert>
      ) : null}

      <Dialog open={Boolean(unbind.pending)} onClose={unbind.cancel} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('settings:security.identities.unbindTitle', { provider })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('settings:security.identities.unbindBody')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button data-testid="identity-unbind-cancel" color="inherit" onClick={unbind.cancel}>
            {t('common:action.cancel')}
          </Button>
          <Button
            data-testid="identity-unbind-confirm"
            color="error"
            variant="contained"
            disabled={unbind.mutation.isPending}
            onClick={() => {
              if (unbind.pending?.bind_id) {
                unbind.mutation.mutate({
                  bind_id: unbind.pending.bind_id,
                  provider: unbind.pending.provider,
                })
              }
            }}
          >
            {t('settings:security.identities.unbind')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

/**
 * 「第三方账号」状态块：列出可绑定的 provider、绑定状态，并可发起绑定。
 *
 * 数据来自 `GET /auth/identities`（已绑定）与 `GET /auth/supported-identities`（可绑定）。
 * 两个接口是后端较新的构建才有的；任一失败（例如旧构建 404）时整块不渲染，
 * 避免把「查不到」误显示成「未绑定」。
 *
 * 绑定走 `startIdentityBind`：POST 拿授权地址后整页跳 IdP（回调由后端 302 回本站，
 * 回来后设置弹窗重新挂载会重新拉一次身份列表）。
 */
export function ThirdPartyAccountsBlock() {
  const { t } = useTranslation(['settings', 'auth'])
  const queryClient = useQueryClient()
  // 用 router 的 location 而不是 window.location：前者是唯一真相，
  // 而且带上 `?settings=account` 后，绑完回来设置会自动开在账号安全那一页。
  const location = useLocation()
  const boundQuery = useQuery({
    queryKey: AUTH_IDENTITIES_QUERY_KEY,
    queryFn: getAuthIdentities,
    retry: false,
  })
  const supportedQuery = useQuery({
    queryKey: AUTH_SUPPORTED_IDENTITIES_QUERY_KEY,
    queryFn: getAuthSupportedIdentities,
    retry: false,
  })

  // 解绑要确认；另外挡住「解绑掉唯一登录方式」这种会把用户锁在门外的操作。
  const meQuery = useMeQuery()
  const unbind = useIdentityUnbind(
    boundQuery.data?.identities.length ?? 0,
    meQuery.data?.has_password === true,
  )

  const bindMutation = useMutation({
    mutationFn: (provider: string) =>
      startIdentityBind(provider, `${location.pathname}${location.search}`),
    onSuccess: (data) => {
      // 后端说这个 provider 已经绑在当前账号上（没走 OAuth，也没有授权地址）：
      // 不跳转，只重新拉一次身份列表，让这一行立刻变「已绑定」。
      if (data.already_bound) {
        void queryClient.invalidateQueries({ queryKey: AUTH_IDENTITIES_QUERY_KEY })
        return
      }
      // 整页跳 IdP：fetch 跟随跳转不会改变地址栏，只有导航才行。
      if (typeof window !== 'undefined') {
        window.location.assign(data.authorize_url)
      }
    },
  })

  if (boundQuery.isPending || supportedQuery.isPending) {
    return null
  }
  if (boundQuery.isError || supportedQuery.isError) {
    return null
  }

  const providers = supportedQuery.data?.identities ?? []
  if (providers.length === 0) {
    return null
  }

  const boundByProvider = new Map(
    (boundQuery.data?.identities ?? []).map((identity) => [identity.provider, identity]),
  )

  return (
    <Stack spacing={workspaceDialogLayout.controlMt}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('settings:security.identities.title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: workspaceDialogLayout.helperTextMt }}
        >
          {t('settings:security.identities.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: workspaceRadius.md,
          overflow: 'hidden',
        }}
      >
        {providers.map((item, index) => (
          <Fragment key={item.provider}>
            {index > 0 ? <Divider /> : null}
            <IdentityRow
              provider={item.provider}
              identity={boundByProvider.get(item.provider)}
              isBinding={bindMutation.isPending && bindMutation.variables === item.provider}
              isUnbinding={
                unbind.mutation.isPending && unbind.mutation.variables?.provider === item.provider
              }
              onBind={(provider) => bindMutation.mutate(provider)}
              onUnbind={unbind.request}
            />
          </Fragment>
        ))}
      </Box>

      {bindMutation.isError ? (
        <Alert data-testid="identity-bind-error" severity="error">
          {describeBindError(bindMutation.error, t)}
        </Alert>
      ) : null}

      <UnbindUi unbind={unbind} t={t} />

      {bindMutation.data?.already_bound ? (
        <Alert data-testid="identity-bind-already-bound" severity="info">
          {t('settings:security.identities.alreadyBound', {
            provider: providerLabel(bindMutation.variables ?? '', t),
          })}
        </Alert>
      ) : null}
    </Stack>
  )
}
