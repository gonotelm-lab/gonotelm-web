import { useQuery } from '@tanstack/react-query'
import { EMAIL_REGISTER_PREFETCH_QUERY_KEY, getEmailRegisterPrefetch } from '../../api/auth'

/** 密码策略是部署配置，会话内固定；取不到时退回简单策略，不阻塞表单。 */
export function useRequireComplexPassword(): boolean {
  const { data } = useQuery({
    queryKey: EMAIL_REGISTER_PREFETCH_QUERY_KEY,
    queryFn: getEmailRegisterPrefetch,
    retry: false,
    staleTime: Infinity,
  })

  return data?.require_complex_password ?? false
}
