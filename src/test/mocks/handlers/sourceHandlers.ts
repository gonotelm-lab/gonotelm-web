import { http } from 'msw'
import {
  createPollSourceStatusFixture,
  createSourceResponseFixture,
} from '../fixtures/source'
import { getMockScenario } from '../scenarios'
import {
  createErrorResponse,
  createSuccessResponse,
  resolveScenarioResponse,
} from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

export const sourceHandlers = [
  http.post(`${apiBaseUrl}/api/v1/source`, async () => {
    const scenario = getMockScenario('source')
    return resolveScenarioResponse({
      scenario,
      successData: createSourceResponseFixture(),
      emptyData: createSourceResponseFixture({
        id: '',
      }),
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/source/:sourceId/status`, async () => {
    const scenario = getMockScenario('source')
    return resolveScenarioResponse({
      scenario,
      successData: createPollSourceStatusFixture({
        status: 'ready',
      }),
      emptyData: createPollSourceStatusFixture({
        status: 'failed',
      }),
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/source/:sourceId/file/upload`, async () => {
    const scenario = getMockScenario('source')
    if (scenario === 'server-error') {
      return createErrorResponse(500, 'mock upload config error', 500_041)
    }
    return createSuccessResponse({
      url: 'https://example.com/upload',
      method: 'POST',
      forms: {
        policy: 'mock-policy',
      },
      headers: {},
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/source/:sourceId/reload`, async () =>
    createSuccessResponse(null),
  ),
  http.delete(`${apiBaseUrl}/api/v1/source/:sourceId`, async () =>
    createSuccessResponse(null),
  ),
  http.put(`${apiBaseUrl}/api/v1/source/:sourceId/title`, async () =>
    createSuccessResponse(null),
  ),
]
