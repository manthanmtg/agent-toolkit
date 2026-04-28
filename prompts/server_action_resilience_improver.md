---
id: server-action-resilience-improver
title: Server Action Resilience Improver Prompt
category: reliability
enabled: true
autonomousSafe: true
---
# Server Action Resilience Improver Prompt

## Objective

Harden one server action, adapter, or filesystem workflow so failures are explicit, validated, and user-recoverable.

## Workflow

### 1. Pick a Target

Prefer code in:

- `lib/actions/` for build, install, sync, doctor, profiles, skills, local skills, or MCP.
- `lib/registry.ts`, `lib/builder.ts`, `lib/linker.ts`, `lib/detector.ts`, or `lib/doctor.ts`.
- `lib/adapters/` where character limits and output formats can fail.

### 2. Audit

Look for:

- Assumed file or directory existence.
- Uncaught `unknown` errors that produce vague messages.
- Missing Zod validation for input data.
- Partial write or symlink behavior that should use safety helpers.
- Ambiguous failure return states from server actions.
- Adapter output that can exceed limits without a clear error.

### 3. Fix

- Fix 1-3 resilience issues.
- Use existing result shapes and helper patterns.
- Prefer validation, clearer error messages, and graceful empty-state handling over broad rewrites.

### 4. No-Op Conditions

- If the target already has clear validation and recovery behavior, no-op.
- If the fix requires redesigning the action contract, log it to `issues_to_look/`.

### 5. Verify

- Run `npm run build`.
- Run focused tests or `npm run test` when behavior changed.
- Run `git diff --check`.

### 6. Commit

Use a message like `fix(actions): return clear profile parse errors`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
