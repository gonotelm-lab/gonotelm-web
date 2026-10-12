/**
 * 注册/登录表单的客户端校验。
 *
 * 这些规则是「体验层」的即时反馈，不是权限边界：邮箱归一化与密码策略最终由后端裁定
 * （`entity.User.SetEmail` + `users_v2` 的 CHECK 约束 + 服务端密码策略），
 * 前端只保证不把明显非法的输入发出去，并把后端的 106013/106014 映射成文案。
 */

/** 与 DDL `chk_users_v2_email_shape` 的 `^[^@[:space:]]+@[^@[:space:]]+$` 同形。 */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+$/

/** 与 `entity.ValidateEmail` 的长度上限一致。 */
export const EMAIL_MAX_LENGTH = 255

/** 与 `entity.MinPasswordBytes` 一致；后端策略变了要同步这里。 */
export const PASSWORD_MIN_LENGTH = 8

/** 与 `entity.MaxPasswordBytes` 一致：bcrypt 只取前 72 字节，超长必须拒绝而不是静默截断。 */
export const PASSWORD_MAX_BYTES = 72

export const VERIFICATION_CODE_LENGTH = 6

/** 与后端 `entity.User.SetEmail` 一致：trim + 全量小写。 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw)
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_SHAPE.test(email)
}

const encoder = new TextEncoder()

export function passwordByteLength(value: string): number {
  return encoder.encode(value).length
}

/**
 * 密码策略：非空、≥ 8 字节、≤ 72 字节；服务端开了复杂密码时（注册前元数据下发）
 * 还要求同时含大写字母、小写字母与数字。长度始终是硬要求，复杂度不是。
 */
export function isValidPassword(value: string, requireComplex = false): boolean {
  const bytes = passwordByteLength(value)
  if (bytes < PASSWORD_MIN_LENGTH || bytes > PASSWORD_MAX_BYTES) {
    return false
  }

  return !requireComplex || isComplexPassword(value)
}

/** 大写字母、小写字母、数字各至少一个；Go 侧 RE2 无前瞻，后端是三条正则分别命中。 */
const UPPER_LETTER = /[A-Z]/
const LOWER_LETTER = /[a-z]/
const DIGIT = /\d/

/**
 * 逐条暴露复杂密码的三条子规则：表单要实时列出「差哪一条」，
 * 不能只给一个是/否，否则用户无从知道该怎么改。
 */
export function hasUpperCase(value: string): boolean {
  return UPPER_LETTER.test(value)
}

export function hasLowerCase(value: string): boolean {
  return LOWER_LETTER.test(value)
}

export function hasDigit(value: string): boolean {
  return DIGIT.test(value)
}

export function isComplexPassword(value: string): boolean {
  return hasUpperCase(value) && hasLowerCase(value) && hasDigit(value)
}

export function isValidVerificationCode(value: string): boolean {
  return new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(value.trim())
}

/** 把用户输入的验证码收敛成纯数字，便于逐位输入框/粘贴都可用。 */
export function normalizeVerificationCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH)
}
