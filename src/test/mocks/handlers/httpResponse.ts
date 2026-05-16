import { delay, HttpResponse } from 'msw'
import type { ApiResult } from '@/types/api'
import type { MockApiScenario } from '../scenarios'

const timeoutDelayMs = 30

export const createSuccessResponse = <T>(data: T) =>
  HttpResponse.json<ApiResult<T>>({
    code: 0,
    msg: 'ok',
    data,
  })

export const createErrorResponse = (
  status = 500,
  message = 'mock server error',
  code = 500_000,
) =>
  HttpResponse.json<ApiResult<null>>(
    {
      code,
      msg: message,
      data: null,
    },
    { status },
  )

export const resolveScenarioResponse = async <T>({
  scenario,
  successData,
  emptyData,
}: {
  scenario: MockApiScenario
  successData: T
  emptyData: T
}) => {
  if (scenario === 'server-error') {
    return createErrorResponse(500, 'mock server error', 500_001)
  }

  if (scenario === 'timeout') {
    await delay(timeoutDelayMs)
    return createErrorResponse(504, 'mock timeout', 504_001)
  }

  if (scenario === 'empty') {
    return createSuccessResponse(emptyData)
  }

  return createSuccessResponse(successData)
}
