---
name: test-strategy
description: >
  Testing workflow for TDD, coverage strategy, regression tests, mocks, fixtures,
  and confidence-driven validation. Use when the task involves adding tests,
  improving coverage, or designing a practical test plan.
domain: testing-master
version: 1.0.0
tags: [testing, tdd, coverage, mocks, regression, quality]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Testing Master: Practical Test Strategy

Tests should increase confidence, not just line counts.

## When To Trigger 🧪

- The user asks for tests, coverage, or TDD
- A bug fix needs a regression test
- A refactor needs safety rails
- Mocks, fixtures, or flaky tests need cleanup

## Test Pyramid With Intent 🏗️

Prefer the cheapest test that proves the requirement:

- Unit tests for business logic and edge cases
- Integration tests for boundaries, wiring, and persistence
- End-to-end tests for critical user journeys only

## TDD Loop 🔁

1. Write the smallest failing test that captures the requirement.
2. Make it pass with the simplest correct implementation.
3. Refactor while keeping the test suite green.

## Coverage Checklist ✅

- [ ] Happy path covered
- [ ] Edge cases and empty inputs covered
- [ ] Error handling and retries covered
- [ ] Authorization and validation paths covered
- [ ] Regression test added for every real bug fixed
- [ ] Assertions verify outcomes, not implementation trivia

## Mocking Rules 🎭

- Mock only true boundaries: network, filesystem, clock, random, queue, external SDKs
- Prefer fakes or realistic fixtures over deep internal mocks
- Do not mock the unit under test
- Keep mocks honest: same shape, same failure modes, same contract

## Test Design Patterns 🧩

### Behavior-focused

```text
Given invalid profile input
When buildProfile() is called
Then it returns a validation error with the missing field name
```

### Table-driven

Use for parsers, validators, and normalization logic with many permutations.

### Regression-first

Reproduce the bug in a failing test before touching the fix.

## Smells To Eliminate 🚨

- Tests that only assert a function was called
- Snapshot sprawl without meaningful review
- Flaky tests tied to wall-clock time or random values
- Shared mutable fixtures across test cases
- Massive integration suites that duplicate unit coverage

## Useful Assertions ✅

Prefer assertions that describe user-visible or domain-visible outcomes:

- Returned values and state changes
- Persisted records
- Rendered UI content
- Emitted events
- Error messages and status codes

## Example Test Plan 📝

For a bug in retryable API sync logic:

1. Unit test backoff calculation
2. Unit test stop condition after max retries
3. Integration test successful retry on transient failure
4. Regression test preserving original error context in logs

## Exit Standard 🏁

Good tests make future edits safer, isolate failures quickly, and document intended behavior.
