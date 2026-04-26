# Security Auditor Prompt

## Objective

Review one security-sensitive Agent Toolkit flow and patch a small, clear vulnerability or hardening gap.

## Workflow

### 1. Pick a Target

Prioritize:

- Filesystem writes, symlink creation, and backups in `lib/safety.ts`, `lib/linker.ts`, and install/sync actions.
- Server actions in `lib/actions/` that accept paths, profile names, skill metadata, or MCP server data.
- Markdown rendering and external links in `app/`.
- Adapter output that may write to user tool configuration locations.

### 2. Audit

Check for:

- Path traversal or unsafe path joins.
- Bare filesystem writes instead of `atomicWrite()`.
- Unvalidated form/action input.
- Missing duplicate or overwrite checks.
- Unsafe external links missing `rel="noopener noreferrer"`.
- User-controlled markdown or HTML rendered unsafely.
- Sensitive local paths or environment details exposed in client-visible errors.

### 3. Fix

- Patch 1-3 issues only.
- Use existing helpers such as `atomicWrite()`, backup helpers, Zod schemas, and duplicate checks.
- If access semantics or install behavior are ambiguous, log the risk instead of inventing policy.

### 4. No-Op Conditions

- If three targets have no obvious security smell, log `security posture strong`.
- If the fix requires redesigning install/sync permissions, log it to `issues_to_look/`.

### 5. Verify

- Run `npm run build`.
- Run focused tests or `npm run test` if validation or safety behavior changed.
- Run `git diff --check`.

### 6. Commit

Use a message like `fix(security): validate install target paths`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
