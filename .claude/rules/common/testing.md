# Testing Guidelines

## Default Behavior

Default: do not create or run tests unless one of these is true:
- The user explicitly asks for tests.
- The change is high-risk (core logic, security, money/data handling, or regression-prone behavior).
- Existing tests in the touched area are failing and need updates.

## Coverage Target (When Testing Is In Scope)

Default target: aim for around 80% coverage on production code paths.

Common test types to include when relevant:
1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (framework chosen per language)

## Test-Driven Development (When Testing Is Requested)

Preferred workflow (when practical):
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Re-check coverage for changed areas

Notes:
- For tiny fixes, prototypes, or documentation-only changes, a lighter test pass can be sufficient.
- For core logic, bug fixes, and user-facing behavior changes, prioritize strong automated test coverage.

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Recommended for new features and bug fixes to keep tests structured
