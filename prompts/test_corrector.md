# Test Corrector Prompt

## Objective

Find and fix currently failing tests in Agent Toolkit. This is repair-only: do not add new feature coverage unless it is required to stabilize an existing failing test.

## Workflow

### 1. Run the Suite

```bash
npm run test
```

If all tests pass, no-op and log `all tests passing` only if a note is needed for traceability.

### 2. Triage Failures

Classify each failure:

- Stale test: assertion no longer matches intended behavior.
- Product regression: implementation changed incorrectly.
- Environment issue: missing mock, timing issue, filesystem path mismatch, or Next.js module boundary problem.

### 3. Fix

- Fix at most 5 failing tests per run.
- Keep each fix isolated.
- If production code changes are needed, keep them small and clearly tied to the failing behavior.
- If the failure requires a broader design decision, log it in `issues_to_look/` and stop.

### 4. Verify

- Re-run `npm run test`.
- Run `npm run build` if production code changed.
- Run `git diff --check`.

### 5. Commit

Use a message like `fix(tests): stabilize registry fixture handling`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
