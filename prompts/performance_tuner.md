# Performance Tuner Prompt

## Objective

Find and fix one small performance issue in Agent Toolkit.

## Workflow

### 1. Pick a Target

Investigate one of:

- A list-heavy page in `app/skills/`, `app/my-skills/`, `app/mcp/`, or `app/profiles/`.
- Client components with sorting, filtering, markdown preview, tab state, or derived lists.
- Server actions or helpers that repeatedly scan `skills/`, `profiles/`, or local tool config files.
- Heavy imports that can be moved closer to the call site or dynamically loaded.

### 2. Audit

Look for:

- Expensive filtering/sorting during every render.
- Unstable callback or derived array references passed deep into components.
- Redundant filesystem scans.
- Repeated adapter construction inside loops.
- Unnecessary client-side bundles from server-only helpers.

### 3. Fix

- Make one targeted improvement.
- Use `useMemo`, `useCallback`, local helper extraction, caching within a single operation, or import boundary cleanup when appropriate.
- Do not change behavior.

### 4. No-Op Conditions

- If the target is already efficient, no-op or pick another target.
- If the fix requires architecture changes across app and actions, log it in `issues_to_look/`.

### 5. Verify

- Run `npm run build`.
- Run `npm run test` if logic changed.
- Run `git diff --check`.

### 6. Commit

Use a message like `perf(skills): memoize filtered skill list`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
