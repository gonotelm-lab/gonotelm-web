import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/user'

export const ME_QUERY_KEY = ['me'] as const

/** Session identity is stable for a session; keep it fresh enough to avoid
 * refetching every time a new observer (AuthGate / AccountMenu) mounts. */
const ME_STALE_TIME_MS = 5 * 60 * 1000

export function useMeQuery() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
    staleTime: ME_STALE_TIME_MS,
  })
}
