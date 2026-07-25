import type {
  CreateSourceResponse,
  GetSourceResponse,
  PollSourceStatusResponse,
} from '@/types/api'

export const createSourceResponseFixture = (
  overrides: Partial<CreateSourceResponse> = {},
): CreateSourceResponse => ({
  id: 'source-created-1',
  ...overrides,
})

export const createPollSourceStatusFixture = (
  overrides: Partial<PollSourceStatusResponse> = {},
): PollSourceStatusResponse => ({
  status: 'ready',
  ...overrides,
})

export const createGetSourceResponseFixture = (
  overrides: Partial<GetSourceResponse> = {},
): GetSourceResponse => {
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

