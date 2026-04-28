---
id: documentation-ghostwriter-prompt
title: Documentation Ghostwriter Prompt
category: documentation
enabled: true
autonomousSafe: true
---
# Documentation Ghostwriter Prompt

## Objective

Keep `README.md`, `PRD.md`, `CLAUDE.md`, and other repository docs in sync with the implementation. Update one document or one section per run.

## Workflow

### 1. Correlate Docs With Code

Compare the docs against current behavior in:

- `app/` pages and workflows.
- `lib/actions/` server actions.
- `lib/adapters/` supported tool output.
- `skills/` source skill format and examples.
- `profiles/` profile schema and defaults.
- `package.json` scripts.

### 2. Update One Area

- Update README setup/usage when commands or workflows change.
- Update PRD status when implementation has clearly moved.
- Update CLAUDE/AGENTS only for operational project rules.
- Add concise examples when they reduce confusion around skills, profiles, adapters, or installation.

### 3. Style

- Use concise GFM.
- Prefer concrete commands and paths.
- Avoid documenting planned behavior as implemented behavior.

### 4. No-Op Conditions

- If the target doc is accurate, no-op.
- If the update depends on unclear product intent, log a note in `issues_to_look/`.

### 5. Verify

- Run `git diff --check`.
- Run any command whose documented behavior you changed, when feasible.

### 6. Commit

Use a message like `docs: clarify profile install workflow`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
