# Build verifier blocked: existing <Html> pages-runtime error during error pages pre-render

## Issue
- Running the `prompts/build_verifier.md` workflow failed at build verification.
- Failure remains: `<Html> should not be imported outside of pages/_document.` during prerender of `/500` and `/_error`.

## Evidence
- `npm run build` (main clean branch)
  - exits with prerender error on `/500` then `/_error` and aborts build.
- `npm run test` passes all tests; one profile warning is logged in test output (`invalid_type` in `invalid.yaml` from fixture diagnostics test), but test suite exits with code 0.
- `npm run lint` remains interactive and requires ESLint config choice in this environment.

## Why not fixed here
- The `<Html>` context error surfaces in generated pages runtime artifacts (`.next/server/pages/_error.js`) with no direct import in repository source.
- Identifying and safely resolving it likely requires broader framework/runtime investigation beyond the small-change scope of this prompt (and prior attempt already documented separate build-block notes).

## Suggested fix
- Investigate source that contributes to generated pages runtime entrypoints in this App Router setup (build metadata/custom pages handling) or pin/fix the Next.js/runtime/tooling version interaction responsible for the regression.
