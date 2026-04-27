# Build blocker: /404 prerender errors with `<Html>` context mismatch

## Issue
- While executing `prompts/accessibility_improver.md`, `npm run build` fails on this baseline codebase.
- Failure: `<Html> should not be imported outside of pages/_document` during prerendering `/404` (and `/_error`), causing build exit code 1.

## Evidence
- Repro command: `npm run build`
- Relevant output:
  - `Error: <Html> should not be imported outside of pages/_document.`
  - `Error occurred prerendering page "/404".`
  - `Export encountered an error on /_error: /404, exiting the build.`

## Fix suggestion
- Investigate Pages Router fallback files (`pages/_document.tsx`, `_app.tsx`, `_error.tsx`) and their interaction with App Router error/not-found routes.
