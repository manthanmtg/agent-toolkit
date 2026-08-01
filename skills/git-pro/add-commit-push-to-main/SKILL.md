---
name: add-commit-push-to-main
description: >
  Commit and push the current session's in-scope changes directly to main.
  Use when the user asks to add, commit, and push session changes to main,
  including requests like "add commit push to main", "commit and push all",
  or "push this to main".
domain: git-pro
version: 1.0.0
tags: [git, commit, push, main, rebase]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Add Commit Push To Main

Commit only the changes that belong to the active user session, rebase on top
of upstream `main` if needed, and finish with the commit pushed to `main`.

## Core Rules

- Target branch is `main`.
- Include only in-scope session changes. Do not stage unrelated user work.
- Inspect the diff before staging and again after staging.
- Run appropriate verification before committing.
- Check upstream before pushing. If `origin/main` moved, rebase the local commit
  on top of it before pushing.
- Do not force-push to `main`.
- Stop on merge conflicts, failing verification, missing remote, auth failure,
  or uncertainty about whether a changed file belongs to the session.

## Workflow

1. Confirm repository state:
   - `git branch --show-current`
   - `git status --short`
   - `git remote -v`
2. Fetch upstream:
   - `git fetch origin main`
3. Inspect the working tree:
   - `git diff --stat`
   - `git diff --check`
   - `git status --short`
4. Stage only session changes:
   - Use explicit paths when unrelated files exist.
   - Use `git add -A` only when every changed and untracked file is in scope.
5. Inspect staged changes:
   - `git diff --cached --stat`
   - `git diff --cached --check`
6. Commit with a clear subject, usually:
   - `feat: add bulk skill install`
   - `fix: ...`
   - `docs: ...`
7. Rebase before push:
   - `git pull --rebase origin main`
   - If this changes the tree, rerun relevant verification.
8. Push:
   - `git push origin main`
9. Report the commit hash, pushed branch, and verification commands.

## Failure Handling

| Situation | Action |
| --- | --- |
| Current branch is not `main` | Stop unless the user explicitly asked to switch or merge into `main`. |
| Unrelated dirty files exist | Leave them unstaged and mention them. |
| Rebase conflict | Stop and report conflicted files. Do not guess. |
| Verification fails | Do not commit or push until fixed. |
| Push rejected after rebase | Fetch and inspect. Do not force-push. |
| Auth/remote failure | Report the command and error. |

## Quick Checklist

- [ ] On `main`
- [ ] Upstream fetched
- [ ] Diff inspected
- [ ] Only session changes staged
- [ ] Verification passed
- [ ] Commit created
- [ ] `git pull --rebase origin main` completed
- [ ] Push to `origin main` completed
