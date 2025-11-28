# Achievement Service Test Design (Checkpoint 2)

This document captures the testing strategies (grounded in class concepts) applied to the Achievements backend. The available achievements are within `db-design.md`.

## Units tests (with fakes and DI)
- All unit tests are within `achievementService.test.ts`.
- Test `AchievementService` logic in isolation by injecting a fake `AchievementRepository` (no real DB). All of the tests should be in a main test suite `Achievement Service` with sub test suite for each public functions and additional achievement evaluation logics.
    - **Class concepts:** Test doubles (fakes), dependency injection to improve testability and control.
    - Decision table testing to validate achievement evaluation logics given user stats input.
    - Boundary value testing to validate edge cases for achievement evaluation logics, should have test cases for all types of achievements.
    - Negative tests
       - Ensure malformed achievements/criteria and non-numeric user stats throw, preventing silent failures. Guards data contracts.
       - Other user stats won't unlock current player's achievements.

## Property-based testing
- All property tests are within `achievementService.property.test.ts`.
- Fast-check properties for idempotency (repeated evaluate never duplicates unlocks) and monotonic unlock expectations across random stats. Captures invariants across broad inputs.

## Other testing strategies to be added