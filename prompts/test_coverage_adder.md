---
id: test-coverage-adder
title: Test Coverage Adder Prompt
category: testing
enabled: true
autonomousSafe: true
---
# Test Coverage Adder Prompt

## Objective

Add meaningful coverage for one untested or undertested file in Agent Toolkit.

## Workflow

### 1. Find a Target

Prefer targets in this order:

1. `lib/` pure utilities, registry, builder, linker, doctor, safety, and adapter logic.
2. `lib/actions/` server actions with filesystem, install, sync, or validation behavior.
3. `app/` components with non-trivial UI state or user workflows.

Use repository search instead of guessing:

```bash
rg --files lib app | rg -v "\\.test\\.(ts|tsx)$"
```

If a test pattern already exists, follow it.

### 2. Write Tests

- Add or extend one test file only.
- Write 5-15 focused test cases when practical.
- Cover happy path, edge cases, invalid input, duplicate detection, adapter output limits, or filesystem error behavior.
- Mock filesystem, home-directory, process, and Next.js dependencies with Vitest when needed.
- Keep production-code changes minimal and only make them when the tests expose an actual bug.

### 3. No-Op Conditions

- If the target requires a large test harness that does not exist, log the missing harness in `issues_to_look/`.
- If all critical files already have healthy coverage, log `coverage is healthy` and stop.

### 4. Verify

- Run the focused test file first when possible.
- Run `npm run test`.
- Run `npm run build` if production code changed.
- Run `git diff --check`.

### 5. Commit

Use a message like `test(registry): cover invalid skill frontmatter`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
