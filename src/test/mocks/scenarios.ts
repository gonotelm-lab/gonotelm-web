export type MockApiDomain = 'notebook' | 'chat' | 'source'

export type MockApiScenario = 'success' | 'empty' | 'server-error' | 'timeout'

const defaultScenarioState: Record<MockApiDomain, MockApiScenario> = {
  notebook: 'success',
  chat: 'success',
  source: 'success',
}

let scenarioState: Record<MockApiDomain, MockApiScenario> = {
  ...defaultScenarioState,
}

export const getMockScenario = (domain: MockApiDomain): MockApiScenario => scenarioState[domain]

export const setMockScenario = (domain: MockApiDomain, scenario: MockApiScenario) => {
  scenarioState[domain] = scenario
}

export const setMockScenarios = (nextState: Partial<Record<MockApiDomain, MockApiScenario>>) => {
  scenarioState = {
    ...scenarioState,
    ...nextState,
  }
}

export const resetMockScenarios = () => {
  scenarioState = {
    ...defaultScenarioState,
  }
}
