import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/http'
import {
  createNotebook,
  deleteNotebook,
  getNotebook,
  getOrCreateNotebookChat,
  listNotebooks,
} from './notebook'
import { setMockScenario } from '@/test/mocks'

describe('notebook api with msw mock', () => {
  it('returns notebook list without real backend', async () => {
    const result = await listNotebooks({ limit: 50, offset: 0 })

    expect(result.notebooks.length).toBeGreaterThan(0)
    expect(result.notebooks[0]?.name).toContain('Rust')
    expect(result.notebooks[0]?.updated_at).toBeTypeOf('number')
  })

  it('supports sort_by query for notebook list', async () => {
    const result = await listNotebooks({
      limit: 50,
      offset: 0,
      sortBy: 'last_active',
    })

    expect(result.notebooks[0]?.id).toBe('notebook-2')
  })

  it('returns empty notebooks for empty scenario', async () => {
    setMockScenario('notebook', 'empty')

    const result = await listNotebooks({ limit: 50, offset: 0 })

    expect(result.notebooks).toEqual([])
  })

  it('returns notebook detail and chat id for workspace bootstrap path', async () => {
    const notebook = await getNotebook('notebook-1')
    const chat = await getOrCreateNotebookChat('notebook-1')

    expect(notebook.id).toBe('notebook-1')
    expect(chat.chat_id).toBe('chat-notebook-1')
  })

  it('creates notebook with optional empty name', async () => {
    const withNameResult = await createNotebook({ name: 'Rust 并发', desc: '' })
    const laterResult = await createNotebook({ name: '', desc: '' })

    expect(withNameResult.id).toBe('notebook-created-with-name')
    expect(laterResult.id).toBe('notebook-created-later')
  })

  it('deletes notebook successfully', async () => {
    await expect(deleteNotebook('notebook-1')).resolves.toBeNull()
  })

  it('throws ApiError on server error scenario', async () => {
    setMockScenario('notebook', 'server-error')

    await expect(listNotebooks()).rejects.toBeInstanceOf(ApiError)
    await expect(listNotebooks()).rejects.toMatchObject({
      status: 500,
      code: 500_001,
    })
  })

  it('throws timeout-like error on timeout scenario', async () => {
    setMockScenario('notebook', 'timeout')

    await expect(getNotebook('notebook-1')).rejects.toMatchObject({
      status: 504,
      code: 504_001,
    })
  })
})
