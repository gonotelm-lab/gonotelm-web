import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/user'

export const ME_QUERY_KEY = ['me'] as const

export function useMeQuery() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
  })
}
