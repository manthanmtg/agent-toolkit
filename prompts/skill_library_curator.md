---
id: skill-library-curator
title: Skill Library Curator Prompt
category: code-quality
enabled: true
autonomousSafe: true
---
# Skill Library Curator Prompt

## Objective

Improve one skill definition in `skills/` so it is accurate, well-structured, and safe to translate across supported tools.

## Workflow

### 1. Pick a Target

Choose one `skills/<domain>/<skill-name>/SKILL.md`.

Prefer skills with:

- Missing or weak metadata.
- Vague descriptions.
- Instructions that are too tool-specific for a shared source skill.
- Markdown structure that may translate poorly to target adapters.
- Supporting-file references that are unclear or stale.

### 2. Audit

Check:

- `name` matches the directory.
- `domain` matches the parent directory.
- Frontmatter uses valid activation values from `CLAUDE.md` and `lib/types.ts`.
- Description clearly explains when the skill should activate.
- Body gives concrete workflow guidance without contradicting repository conventions.
- Content is useful for Claude Code, Cursor, Windsurf, OpenCode, Codex, and AGENTS.md output.

### 3. Fix

- Update one skill file only.
- Keep the original purpose of the skill intact.
- Do not create a new skill unless a human explicitly requested it.

### 4. No-Op Conditions

- If three checked skills are already clean, log `skill library is healthy`.
- If a skill's intended behavior is unclear, log the ambiguity in `issues_to_look/`.

### 5. Verify

- Run `npm run build` to validate parsing and build behavior.
- Run `git diff --check`.

### 6. Commit

Use a message like `docs(skills): clarify frontend review activation`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
