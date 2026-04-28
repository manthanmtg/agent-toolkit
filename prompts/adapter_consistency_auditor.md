---
id: adapter-consistency-auditor
title: Adapter Consistency Auditor Prompt
category: code-quality
enabled: true
autonomousSafe: true
---
# Adapter Consistency Auditor Prompt

## Objective

Check one supported tool adapter for consistency with the shared skill model and the other adapters.

## Workflow

### 1. Pick a Target

Choose one file in `lib/adapters/`:

- `claude-code.ts`
- `cursor.ts`
- `windsurf.ts`
- `opencode.ts`
- `codex.ts`
- `agents-md.ts`

### 2. Audit

Compare the adapter against `lib/adapters/base.ts`, `lib/adapters/index.ts`, and `lib/types.ts`.

Look for:

- Missing metadata in translated skills.
- Incorrect activation handling.
- Broken symlink target paths.
- Character limit behavior that silently truncates important content.
- Divergence from naming or formatting patterns used by other adapters.
- Imports from `./index` instead of `./base`.

### 3. Fix

- Make one small consistency fix.
- Preserve documented behavior for the target tool.
- Add or update tests if an adapter test pattern exists.

### 4. No-Op Conditions

- If the adapter is consistent, no-op or inspect one more adapter.
- If a change depends on uncertain target-tool semantics, log it to `issues_to_look/`.

### 5. Verify

- Run `npm run build`.
- Run `npm run test` if adapter behavior has coverage.
- Run `git diff --check`.

### 6. Commit

Use a message like `fix(adapters): align windsurf activation output`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
