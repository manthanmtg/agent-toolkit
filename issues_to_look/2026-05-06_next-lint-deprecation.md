# Next.js 15.x `next lint` Deprecation

## Issue
Running `npm run lint` (which calls `next lint`) produces a deprecation warning:
```
`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .
```

## Evidence
Observed during `build_verifier.md` run on 2026-05-06.

## Suggested Fix
Run the suggested codemod or manually migrate to ESLint CLI. This involves:
1. Converting `.eslintrc.json` to a flat config (e.g., `eslint.config.mjs`).
2. Updating the `lint` script in `package.json` to use `eslint .`.
3. Ensuring all necessary ESLint plugins (especially `eslint-config-next`) are compatible with the new CLI approach.

## Why I held back
The migration to ESLint flat config can be complex and might require updates to multiple files or dependencies, which exceeds the "small, reviewable improvement" scope of a single `build_verifier.md` run. It's safer to log this for a dedicated migration task.
