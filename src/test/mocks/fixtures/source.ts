import type { CreateSourceResponse, PollSourceStatusResponse } from '@/types/api'

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
