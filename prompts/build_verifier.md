# Build Verifier Prompt

## Objective

Ensure Agent Toolkit builds cleanly with zero known regressions. Fix only issues that prevent a clean build, typecheck, lint, or test run.

## Workflow

### 1. Run Verification

Start with the checks that fit the repository:

```bash
npm run build
npm run test
npm run lint
```

If all relevant checks pass, no-op.

### 2. Triage Failures

Identify the failing stage:

| Stage | Command | Common Issues |
| --- | --- | --- |
| Build/typecheck | `npm run build` | Import errors, server/client boundary issues, strict TypeScript errors, Next.js build failures |
| Tests | `npm run test` | Broken assertions, stale mocks, behavior regressions |
| Lint | `npm run lint` | Unused imports, hook dependency issues, accessibility warnings |

### 3. Fix

- Fix only what is needed to make the check pass.
- Prefer local, obvious changes: missing imports, stale type annotations, renamed exports, or small compatibility fixes.
- If the fix requires touching more than 3 files or changing more than 30 lines, log it to `issues_to_look/` instead.

### 4. Verify

- Re-run the failed command.
- Run `git diff --check`.
- If the same issue still fails and the fix is not obvious, revert your changes and log the blocker.

### 5. Commit

Use a message like `fix(build): resolve adapter type mismatch`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
