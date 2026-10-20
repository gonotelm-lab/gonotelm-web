import type {
  GetNotebookSharingResponse,
  ListNotebooksResponse,
  ListNotebookSourcesResponse,
  Notebook,
  NotebookAccess,
  NotebookSharingMember,
  NotebookSource,
  NotebookSummary,
  UpsertNotebookMemberResponse,
} from '@/types/api'

export const createNotebookSummaryFixture = (
  overrides: Partial<NotebookSummary> = {},
): NotebookSummary => ({
  id: 'notebook-1',
  name: 'Rust 入门',
  desc: 'Rust 教程笔记',
  source_count: 2,
  updated_at: Date.UTC(2025, 6, 18),
  ...overrides,
})

export const createNotebookFixture = (
  overrides: Partial<Notebook> = {},
): Notebook => ({
  id: 'notebook-1',
  name: 'Rust 入门',
  desc: 'Rust 教程笔记',
  source_count: 2,
  updated_at: Date.UTC(2025, 6, 18),
  ...overrides,
})

export const createNotebookSourceFixture = (
  overrides: Partial<NotebookSource> = {},
): NotebookSource => {
  const sourceId = overrides.id ?? 'source-1'
  return {
    id: sourceId,
    kind: 'text',
    status: 'ready',
    title: 'Ownership 速记',
    text: {
      text: 'Ownership 是 Rust 的核心概念',
    },
    parsed_content: {
      url: `https://preview.example/${sourceId}.md`,
    },
    ...overrides,
  }
}

export const createListNotebooksResponseFixture = (
  notebooks: NotebookSummary[],
): ListNotebooksResponse => ({
  notebooks,
  limit: 50,
  offset: 0,
  has_more: false,
})

export const createListNotebookSourcesResponseFixture = (
  sources: NotebookSource[],
): ListNotebookSourcesResponse => ({
  sources,
  limit: 50,
  offset: 0,
  has_more: false,
})

export const createNotebookSharingMemberFixture = (
  overrides: Partial<NotebookSharingMember> = {},
): NotebookSharingMember => ({
  user_id: 'user-2',
  email: 'alice@example.com',
  nickname: 'Alice',
  avatar_url: '',
  role: 'viewer',
  ...overrides,
})

export const createGetNotebookSharingResponseFixture = (
  overrides: Partial<GetNotebookSharingResponse> = {},
): GetNotebookSharingResponse => ({
  visibility: 'restricted',
  members: [createNotebookSharingMemberFixture()],
  ...overrides,
})

export const createNotebookAccessFixture = (
  overrides: Partial<NotebookAccess> = {},
): NotebookAccess => ({
  role: 'owner',
  can_view: true,
  can_manage_content: true,
  can_manage_notebook: true,
  can_manage_sharing: true,
  ...overrides,
})

export const createUpsertNotebookMemberResponseFixture = (
  overrides: Partial<UpsertNotebookMemberResponse> = {},
): UpsertNotebookMemberResponse => ({
  user_id: 'user-2',
  role: 'viewer',
  ...overrides,
})
