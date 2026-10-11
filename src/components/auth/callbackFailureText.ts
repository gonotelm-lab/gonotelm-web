import type { TFunction } from 'i18next'
import { CALLBACK_REASON, type AuthAttemptMode } from '../../lib/auth'

/** provider 名走 `provider.*`，未知名字直接显示原名，空值给通用称呼。 */
function providerLabel(provider: string, t: TFunction): string {
  if (!provider) {
    return t('callbackReason.providerFallback')
  }
  const known = t(`provider.${provider}`)
  return known === `provider.${provider}` ? provider : known
}

/**
 * 回调失败的文案：同一个 reason 在登录与绑定下的说法不同。
 *
 * 只按 reason 取文案，绝不回显后端 `msg`——那是内部信息，而且顶层导航下
 * 用户只会看到一页 JSON（这正是落地页存在的理由）。
 */
export function describeCallbackFailure(
  reason: string,
  provider: string,
  mode: AuthAttemptMode,
  t: TFunction,
): string {
  const isBind = mode === 'bind'

  switch (reason) {
    case CALLBACK_REASON.loginStateNotFound:
    case CALLBACK_REASON.loginStateMismatch:
      return isBind ? t('callbackReason.bindSessionExpired') : t('callbackReason.sessionExpired')
    case CALLBACK_REASON.idpAccessDenied:
      return t('callbackReason.idpAccessDenied', { provider: providerLabel(provider, t) })
    case CALLBACK_REASON.idpError:
    case CALLBACK_REASON.idpExchangeError:
      return isBind
        ? t('callbackReason.bindIdpFailed', { provider: providerLabel(provider, t) })
        : t('callbackReason.idpFailed', { provider: providerLabel(provider, t) })
    case CALLBACK_REASON.userBanned:
      return t('callbackReason.userBanned')
    case CALLBACK_REASON.idpEmailUnavailable:
      return t('callbackReason.idpEmailUnavailable', { provider: providerLabel(provider, t) })
    case CALLBACK_REASON.identityAlreadyLinked:
      return t('callbackReason.identityAlreadyLinked', { provider: providerLabel(provider, t) })
    case CALLBACK_REASON.providerAlreadyBound:
      return t('callbackReason.providerAlreadyBound')
    case CALLBACK_REASON.emailNotVerified:
      return t('callbackReason.emailNotVerified')
    case CALLBACK_REASON.identityNotFound:
      return t('callbackReason.identityNotFound')
    case CALLBACK_REASON.providerNotFound:
      return t('callbackReason.providerNotFound')
    case CALLBACK_REASON.userNotFound:
    case CALLBACK_REASON.userSessionNotFound:
      return t('callbackReason.accountAbnormal')
    default:
      // 含 internal-callback-error 与后端将来新增但前端还没登记的 reason。
      return isBind ? t('callbackReason.bindFailed') : t('callbackReason.loginFailed')
  }
}
