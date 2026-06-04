import { chatHandlers } from './chatHandlers'
import { notebookHandlers } from './notebookHandlers'
import { sourceHandlers } from './sourceHandlers'
import { studioHandlers } from './studioHandlers'

export const handlers = [
  ...notebookHandlers,
  ...chatHandlers,
  ...sourceHandlers,
  ...studioHandlers,
]
