import type {
  ListNotebooksResponse,
  ListNotebookSourcesResponse,
  Notebook,
  NotebookSource,
  NotebookSummary,
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
