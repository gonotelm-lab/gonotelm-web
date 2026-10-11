import { Fragment } from 'react'
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  getAuthIdentities,
  getAuthSupportedIdentities,
  IdentityBindRedirectError,
  startIdentityBind,
} from '../../api/auth'
import type { AuthIdentity } from '../../types/api'
import { ProviderIcon } from '../auth/ProviderIcon'
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
  onBind,
}: {
  provider: string
  identity?: AuthIdentity
  isBinding: boolean
  onBind: (provider: string) => void
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
        <Typography
          variant="caption"
          data-testid={`identity-status-${provider}`}
          color="primary.main"
          sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          {t('settings:security.identities.bound')}
        </Typography>
      ) : (
        <Stack direction="row" spacing={workspaceSpace.sm} sx={{ alignItems: 'center' }}>
          <Typography
            variant="caption"
            data-testid={`identity-status-${provider}`}
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {t('settings:security.identities.unbound')}
          </Typography>
          <Button
            data-testid={`identity-bind-${provider}`}
            size="small"
            variant="outlined"
            disabled={isBinding}
            onClick={() => onBind(provider)}
          >
            {isBinding
              ? t('settings:security.identities.binding')
              : t('settings:security.identities.bind')}
          </Button>
        </Stack>
      )}
    </Stack>
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

  const bindMutation = useMutation({
    mutationFn: (provider: string) =>
      startIdentityBind(
        provider,
        typeof window === 'undefined'
          ? '/'
          : `${window.location.pathname}${window.location.search}`,
      ),
    onSuccess: (data) => {
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
              onBind={(provider) => bindMutation.mutate(provider)}
            />
          </Fragment>
        ))}
      </Box>

      {bindMutation.isError ? (
        <Alert data-testid="identity-bind-error" severity="error">
          {describeBindError(bindMutation.error, t)}
        </Alert>
      ) : null}
    </Stack>
  )
}
