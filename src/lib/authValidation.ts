/**
 * 注册/登录表单的客户端校验。
 *
 * 这些规则是「体验层」的即时反馈，不是权限边界：邮箱归一化与口令策略最终由后端裁定
 * （`entity.User.SetEmail` + `users_v2` 的 CHECK 约束 + 服务端口令策略），
 * 前端只保证不把明显非法的输入发出去，并把后端的 106013/106014 映射成文案。
 */

/** 与 DDL `chk_users_v2_email_shape` 的 `^[^@[:space:]]+@[^@[:space:]]+$` 同形。 */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+$/

/** 口令最小长度；后端策略落地后如与之不一致，改这一个常量。 */
export const PASSWORD_MIN_LENGTH = 8

/** bcrypt 只取前 72 字节，超过部分会被静默丢弃，因此在这里就拦下。 */
export const PASSWORD_MAX_BYTES = 72

export const VERIFICATION_CODE_LENGTH = 6

/** 与后端 `entity.User.SetEmail` 一致：trim + 全量小写。 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_SHAPE.test(normalizeEmail(raw))
}

const encoder = new TextEncoder()

export function passwordByteLength(value: string): number {
  return encoder.encode(value).length
}

/**
 * 口令策略（暂定）：非空、≥ 8 字节、≤ 72 字节。
 * 不做「必须含大小写/数字」的复杂度要求——那类规则会诱导用户写可预测的口令，
 * 长度才是主要强度来源。
 */
export function isValidPassword(value: string): boolean {
  const bytes = passwordByteLength(value)
  return bytes >= PASSWORD_MIN_LENGTH && bytes <= PASSWORD_MAX_BYTES
}

export function isValidVerificationCode(value: string): boolean {
  return new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(value.trim())
}

/** 把用户输入的验证码收敛成纯数字，便于逐位输入框/粘贴都可用。 */
export function normalizeVerificationCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH)
}
