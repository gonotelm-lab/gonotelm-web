import { authHandlers } from './authHandlers'
import { chatHandlers } from './chatHandlers'
import { chatSuggestionsHandlers } from './chatSuggestionsHandlers'
import { favouriteHandlers } from './favouriteHandlers'
import { notebookHandlers } from './notebookHandlers'
import { sourceHandlers } from './sourceHandlers'
import { studioHandlers } from './studioHandlers'

export const handlers = [
  ...authHandlers,
  ...notebookHandlers,
  ...favouriteHandlers,
  ...chatHandlers,
  ...chatSuggestionsHandlers,
  ...sourceHandlers,
  ...studioHandlers,
]
