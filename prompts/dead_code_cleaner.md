# Dead Code Cleaner Prompt

## Objective

Remove a small amount of confirmed dead code from Agent Toolkit.

## Workflow

### 1. Pick One Category

- Unused exports in `lib/`.
- Orphaned app components no longer imported by any route.
- Stale package dependencies not imported anywhere.
- Commented-out implementation blocks.
- Unused CSS selectors or theme tokens in `app/globals.css`.

### 2. Prove It Is Dead

- Search thoroughly with `rg`.
- Check dynamic imports, route conventions, adapter registration, test references, and markdown/docs mentions.
- Be conservative with files used by Next.js conventions or exported for future tool adapters.

### 3. Remove

- Remove at most 5 dead items per run.
- Keep total diff small.
- Do not combine cleanup with refactors.

### 4. No-Op Conditions

- If usage is ambiguous, log the evidence in `issues_to_look/` and stop.
- If the cleanup would require changing behavior, do not remove it.

### 5. Verify

- Run `npm run build`.
- Run `npm run test` if the removed item had tests or touched logic.
- Run `git diff --check`.

### 6. Commit

Use a message like `chore: remove unused adapter helper`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
