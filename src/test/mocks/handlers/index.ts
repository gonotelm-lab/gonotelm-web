import { chatHandlers } from './chatHandlers'
import { notebookHandlers } from './notebookHandlers'
import { sourceHandlers } from './sourceHandlers'

export const handlers = [...notebookHandlers, ...chatHandlers, ...sourceHandlers]
