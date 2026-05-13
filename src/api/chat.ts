import { ApiError, request } from '../lib/http'
import type {
  ApiResult,
  ChatAbortStreamRequest,
  ChatCreateMessageRequest,
  ChatCreateMessageResponse,
  ChatListMessagesResponse,
  ChatMessageStreamEvent,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const defaultSseEventType = 'message'

interface ListChatMessagesParams {
  id: string
  cursor?: number
  limit?: number
}

interface BuildChatStreamUrlParams {
  id: string
  task_id: string
  last_stream_id?: string
}

interface StreamChatEventsOptions extends BuildChatStreamUrlParams {
  signal?: AbortSignal
  onEvent: (eventType: string, event: ChatMessageStreamEvent) => void
}

interface ParsedSseFrame {
  eventType: string
  dataText: string
}

const parseSseFrame = (frame: string): ParsedSseFrame | null => {
  const lines = frame.split('\n')
  let eventType = defaultSseEventType
  const dataParts: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) {
      continue
    }
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim() || defaultSseEventType
      continue
    }
    if (line.startsWith('data:')) {
      dataParts.push(line.slice('data:'.length).trimStart())
    }
  }

  if (dataParts.length === 0) {
    return null
  }

  return {
    eventType,
    dataText: dataParts.join('\n'),
  }
}

const consumeSseBuffer = (
  buffer: string,
  onEvent: (eventType: string, event: ChatMessageStreamEvent) => void,
): string => {
  let rest = buffer

  while (true) {
    const separatorIndex = rest.indexOf('\n\n')
    if (separatorIndex === -1) {
      break
    }

    const frame = rest.slice(0, separatorIndex)
    rest = rest.slice(separatorIndex + 2)
    const parsed = parseSseFrame(frame)
    if (!parsed) {
      continue
    }

    try {
      const payload = JSON.parse(parsed.dataText) as ChatMessageStreamEvent
      onEvent(parsed.eventType, payload)
    } catch {
      // Ignore malformed SSE frames and continue consuming stream.
    }
  }

  return rest
}

const tryParseApiResult = async <T>(response: Response): Promise<ApiResult<T> | null> => {
  try {
    return (await response.json()) as ApiResult<T>
  } catch {
    return null
  }
}

export function createChatMessage(payload: ChatCreateMessageRequest) {
  const normalizedPayload = {
    prompt: payload.prompt.trimEnd(),
    source_ids: payload.source_ids,
    enable_thinking: payload.enable_thinking,
  }
  const chatId = encodeURIComponent(payload.id)
  return request<ChatCreateMessageResponse>(`/api/v1/chat/${chatId}/message/create`, {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  })
}

export function listChatMessages(params: ListChatMessagesParams) {
  const query = new URLSearchParams()
  if (typeof params.cursor === 'number') {
    query.set('cursor', String(params.cursor))
  }
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  const chatId = encodeURIComponent(params.id)
  const queryString = query.toString()
  const url = queryString
    ? `/api/v1/chat/${chatId}/message/list?${queryString}`
    : `/api/v1/chat/${chatId}/message/list`
  return request<ChatListMessagesResponse>(url)
}

export function abortChatStream(payload: ChatAbortStreamRequest) {
  const chatId = encodeURIComponent(payload.id)
  return request<null>(`/api/v1/chat/${chatId}/stream/abort`, {
    method: 'POST',
    body: JSON.stringify({ task_id: payload.task_id }),
  })
}

export function buildChatStreamUrl(params: BuildChatStreamUrlParams) {
  const query = new URLSearchParams()
  query.set('task_id', params.task_id)
  if (params.last_stream_id) {
    query.set('last_stream_id', params.last_stream_id)
  }

  const chatId = encodeURIComponent(params.id)
  return `${API_BASE_URL}/api/v1/chat/${chatId}/stream?${query.toString()}`
}

export async function streamChatEvents(options: StreamChatEventsOptions) {
  const response = await fetch(buildChatStreamUrl(options), {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
    },
    signal: options.signal,
  })

  if (!response.ok) {
    const body = await tryParseApiResult<unknown>(response)
    throw new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await tryParseApiResult<unknown>(response)
    if (body && body.code !== 0) {
      throw new ApiError(body.msg, body.code, response.status)
    }
    return
  }

  if (!response.body) {
    throw new ApiError('SSE response body is empty', -1, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      break
    }

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')
    buffer = consumeSseBuffer(buffer, options.onEvent)
  }

  buffer = buffer.replace(/\r\n/g, '\n')
  if (buffer.trim()) {
    consumeSseBuffer(`${buffer}\n\n`, options.onEvent)
  }
}
