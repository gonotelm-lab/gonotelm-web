import type {
  CreateSourceResponse,
  GetSourceParsedTreeResponse,
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

export const createSourceParsedTreeFixture = (
  overrides: Partial<GetSourceParsedTreeResponse> = {},
): GetSourceParsedTreeResponse => ({
  height: 2,
  root: {
    id: 'root-1',
    content: 'Root node content',
    level: 0,
    pos: 0,
    is_leaf: false,
    children: [
      {
        id: 'child-1',
        content: 'Child node content',
        level: 1,
        pos: 1,
        is_leaf: true,
      },
    ],
  },
  ...overrides,
})
