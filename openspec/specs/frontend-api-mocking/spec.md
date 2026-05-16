# frontend-api-mocking Specification

## Purpose
TBD - created by archiving change web-test-mock-and-ui-regression. Update Purpose after archive.
## Requirements
### Requirement: Test Mode API Interception
The frontend test runtime MUST intercept all HTTP requests through a centralized mock layer instead of calling real backend endpoints.

#### Scenario: Default test run uses mocked responses
- **WHEN** a unit test or component-composition test triggers an API request
- **THEN** the request is resolved by configured mock handlers without depending on external backend availability

### Requirement: Scenario-Driven Mock Responses
The mock layer MUST support scenario-based responses so tests can deterministically choose success, empty, timeout, and error branches.

#### Scenario: Test selects explicit error scenario
- **WHEN** a test declares an API scenario as `server-error`
- **THEN** the corresponding request returns the predefined error payload and status code for stable assertions

### Requirement: Unhandled Request Fail-Fast
The test runtime MUST fail when an API request has no matching mock handler, unless the request is explicitly listed as allowed passthrough.

#### Scenario: Unexpected API call is not mocked
- **WHEN** test code sends a request that has no registered handler
- **THEN** the test fails with method and URL details to force handler completion

### Requirement: Shared Fixture Reuse
Mock handlers MUST support reusable fixtures so multiple tests can share consistent domain data with minimal duplication.

#### Scenario: Fixture update propagates to dependent tests
- **WHEN** a shared fixture is updated for a business domain
- **THEN** all tests referencing that fixture receive the updated payload without per-test data copy

