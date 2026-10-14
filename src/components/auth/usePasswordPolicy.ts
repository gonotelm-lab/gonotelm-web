import { useQuery } from '@tanstack/react-query'
import { AUTH_PREFETCH_QUERY_KEY, getAuthPrefetch } from '../../api/auth'

/** 服务端密码策略的查询结果：策略本身 + 「还没拿到」的状态。 */
export interface PasswordPolicy {
  /** 是否要求复杂密码（大写 + 小写 + 数字）。 */
  requireComplexPassword: boolean
  /** 还没取回来。口令表单应等它落定再放行提交，否则会按宽松规则放过去再被后端 106014 打回。 */
  isPending: boolean
}

/**
 * 密码策略是部署配置，会话内固定；查询失败时退回简单策略（长度下限仍是硬要求），
 * 不阻塞表单——注册与改密码不能因为元数据抖动就不可用。
 *
 * 全站只有一个 `GET /auth/prefetch`（后端已把注册页/重置页两个接口合并），
 * 所以这里固定用同一个查询键与请求函数，各入口共享同一份缓存。
 */
function usePasswordPolicy(): PasswordPolicy {
  const { data, isPending } = useQuery({
    queryKey: AUTH_PREFETCH_QUERY_KEY,
    queryFn: getAuthPrefetch,
    retry: false,
    staleTime: Infinity,
  })

  return { requireComplexPassword: data?.require_complex_password ?? false, isPending }
}

/** 注册页与设置/修改密码表单：只要策略值，不需要阻塞渲染。 */
export function useRequireComplexPassword(): boolean {
  return usePasswordPolicy().requireComplexPassword
}

/**
 * 找回密码页：额外暴露 `isPending`。
 *
 * 重置页在拿到策略前不渲染口令表单，避免用户按错误规则填写；与注册页命中同一个
 * `GET /auth/prefetch` 查询（同一个查询键），不再有第二个元数据接口。
 */
export function useResetPasswordPolicy(): PasswordPolicy {
  return usePasswordPolicy()
}
