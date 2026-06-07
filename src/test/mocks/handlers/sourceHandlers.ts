import { http } from 'msw'
import {
  createGetSourceResponseFixture,
  createSourceParsedTreeFixture,
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
  http.get('https://preview.example/:filename', async ({ params }) =>
    new Response(`# ${String(params.filename ?? 'source')}\n\nMock preview content.`, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    }),
  ),
  http.get('https://download.example/:filename', async ({ params }) =>
    new Response(`# ${String(params.filename ?? 'source')}\n\nMock download content.`, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    }),
  ),
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
  http.get(`${apiBaseUrl}/api/v1/source/:sourceId`, async ({ params, request }) => {
    const scenario = getMockScenario('source')
    const sourceId = String(params.sourceId ?? 'source-1')
    const download = new URL(request.url).searchParams.get('download') === 'true'
    return resolveScenarioResponse({
      scenario,
      successData: createGetSourceResponseFixture({
        id: sourceId,
        parsed_content: {
          url: download
            ? `https://download.example/${sourceId}.md?download=1`
            : `https://preview.example/${sourceId}.md`,
        },
      }),
      emptyData: createGetSourceResponseFixture({
        id: sourceId,
        parsed_content: {
          url: '',
        },
      }),
    })
  }),
  http.get(`${apiBaseUrl}/api/v1/source/:sourceId/parsed/tree`, async () => {
    const scenario = getMockScenario('source')
    return resolveScenarioResponse({
      scenario,
      successData: createSourceParsedTreeFixture(),
      emptyData: createSourceParsedTreeFixture({
        root: undefined,
        height: 0,
      }),
    })
  }),
]
