---
id: profile-workflow-auditor
title: Profile Workflow Auditor Prompt
category: feature-quality
enabled: true
autonomousSafe: true
---
# Profile Workflow Auditor Prompt

## Objective

Improve one profile-related workflow so profile definitions remain reliable and predictable.

## Workflow

### 1. Pick a Target

Choose one:

- `profiles/*.yaml`
- Profile parsing or matching in `lib/registry.ts`.
- Profile actions in `lib/actions/profiles.ts`.
- Profile UI in `app/profiles/`.
- Build/install behavior that consumes profile include/exclude patterns.

### 2. Audit

Look for:

- Invalid or stale profile YAML.
- Include/exclude glob behavior that is unclear or untested.
- Missing validation or weak error messages.
- UI states that hide parsing/build failures.
- Docs that do not match profile behavior.

### 3. Fix

- Make one small improvement.
- Keep profile schema compatibility unless the existing schema is clearly invalid.
- Prefer validation, clearer feedback, or a focused test.

### 4. No-Op Conditions

- If the workflow is clear and validated, no-op.
- If fixing it requires changing profile semantics, log the issue.

### 5. Verify

- Run `npm run build`.
- Run `npm run test` if profile logic changed.
- Run `git diff --check`.

### 6. Commit

Use a message like `fix(profiles): report invalid include patterns`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
