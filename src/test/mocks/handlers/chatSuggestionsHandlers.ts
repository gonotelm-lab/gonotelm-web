import { http } from 'msw'
import { createChatGetSuggestionsResponseFixture } from '../fixtures/chat'
import { getMockScenario } from '../scenarios'
import { resolveScenarioResponse } from './httpResponse'

const apiBaseUrl = 'http://127.0.0.1:4173'

export const chatSuggestionsHandlers = [
  http.get(`${apiBaseUrl}/api/v1/chats/:chatId/suggestions`, async () => {
    const scenario = getMockScenario('chat')
    return resolveScenarioResponse({
      scenario,
      successData: createChatGetSuggestionsResponseFixture(),
      emptyData: createChatGetSuggestionsResponseFixture({ questions: [] }),
    })
  }),
]
