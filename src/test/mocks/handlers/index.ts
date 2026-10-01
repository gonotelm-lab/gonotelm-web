import { authHandlers } from './authHandlers'
import { chatHandlers } from './chatHandlers'
import { chatSuggestionsHandlers } from './chatSuggestionsHandlers'
import { notebookHandlers } from './notebookHandlers'
import { sourceHandlers } from './sourceHandlers'
import { studioHandlers } from './studioHandlers'

export const handlers = [
  ...authHandlers,
  ...notebookHandlers,
  ...chatHandlers,
  ...chatSuggestionsHandlers,
  ...sourceHandlers,
  ...studioHandlers,
]
