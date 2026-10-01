import { request } from '../lib/http'
import type { MeResponse } from '../types/api'

export function getMe() {
  return request<MeResponse>('/api/v1/user/me')
}
