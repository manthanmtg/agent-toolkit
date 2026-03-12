---
name: perfect-commits
description: >
  Git workflow guide for precise commits, reviewable pull requests, clean rebases,
  safe conflict resolution, and branch hygiene. Use when the task involves commits,
  PR prep, history cleanup, cherry-picks, or rebasing.
domain: git-pro
version: 1.0.0
tags: [git, commits, pull-requests, rebase, cherry-pick, workflow]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Git Pro: Perfect Commits

Ship changes that are easy to review, easy to revert, and safe to land.

## When To Use 🚦

Trigger this skill when the user asks for:

- A clean commit series or polished PR
- Interactive rebase, squash, split, or cherry-pick help
- Conflict resolution with history preserved
- Safer force-pushes, hotfixes, or backports

## Operating Principles 🧭

- Make each commit represent one idea.
- Keep history truthful. Do not rewrite shared history unless the user clearly wants that.
- Stage intentionally: review the diff before every commit.
- Prefer reversible changes over clever history tricks.

## Workflow Checklist ✅

- [ ] Confirm the target branch and the review base
- [ ] Inspect `git status`, `git diff`, and `git diff --cached`
- [ ] Group changes by concern before staging
- [ ] Write a commit subject that explains intent, not mechanics
- [ ] Re-read the final diff for accidental edits, secrets, and debug code
- [ ] Use `--force-with-lease` instead of `--force` when rewriting remote history

## Commit Craft ✍️

### Good commit subjects

- `fix: avoid duplicate webhook retries on timeout`
- `feat: add profile-level skill filtering`
- `refactor: isolate markdown rendering state`

### Weak commit subjects

- `updates`
- `fix stuff`
- `wip`

### Commit template

```text
<type>: <user-visible intent>

Why:
- What problem changed?

How:
- What approach was taken?

Risk:
- What should reviewers watch closely?
```

## PR Shaping 📦

Aim for a PR that a reviewer can understand in one pass:

1. Put mechanical renames or formatting in their own commit.
2. Put behavior changes in focused commits with tests nearby.
3. Add a short PR summary: problem, approach, validation, risk.
4. Call out migrations, feature flags, or rollback steps explicitly.

## Rebase And Conflict Playbook 🔀

### Before rebasing

- Confirm whether the branch is already shared
- Save work in progress with a temporary commit or stash
- Read the incoming branch diff so conflicts are expected, not surprising

### During conflicts

- Resolve one file at a time
- Reconstruct the intended behavior, not just the text merge
- Re-run focused tests after each non-trivial conflict
- Preserve both sides when each change solves a different problem

### After rebasing

- Compare old and new history with `git range-diff`
- Re-run tests and linting
- Push with `--force-with-lease` only if needed

## Useful Commands 🛠️

```bash
git add -p
git commit --fixup <sha>
git rebase -i --autosquash origin/main
git range-diff origin/main...HEAD@{1} origin/main...HEAD
git cherry-pick -x <sha>
git push --force-with-lease
```

## Example Scenarios 💡

### Split a noisy change

If one branch contains refactor + bug fix + formatting:

- Commit formatting separately
- Commit the refactor without behavior change
- Commit the bug fix with the test that proves it

### Prepare a high-signal PR

Include:

- Problem statement
- Main design decision
- Validation performed
- Rollback or mitigation plan

## Red Flags 🚨

- Large commits that mix unrelated concerns
- Rebasing or squashing commits the team is already reviewing without warning
- Force pushing without confirming branch ownership
- Resolving conflicts by blindly taking "ours" or "theirs"

## Final Standard 🏁

A polished git result should let a reviewer answer three questions fast:

1. What changed?
2. Why did it change?
3. How risky is it to merge?
