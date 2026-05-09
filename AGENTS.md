# Agent Toolkit — Repository Guide

This is a **Next.js 15 fullstack webapp** that manages AI coding agent skills and configurations. It builds, translates, and deploys skill files to 5 supported tools: Claude Code, Cursor, Windsurf, OpenCode, and Codex.

## Tech Stack

- Next.js 15 (App Router, Server Actions, Turbopack)
- TypeScript (strict), React 19, TailwindCSS 4, Lucide icons, Zod, Vitest, sonner (toasts)
- Run with: `npm install` then one of: `npm run dev` (http://localhost:3000), `npm run build`, `npm run start`, `npm run lint`, `npm run test`

## Project Structure

- `app/` — Next.js pages (App Router), including components, skills, /skills/[domain], /skills/[domain]/[name], /skills/new, my-skills, add-skill, mcp, projects, profiles, doctor, install, settings
- `lib/` — Core logic: types, registry, builder, linker, detector, doctor, safety, MCP helpers
- `lib/adapters/` — Tool-specific translators (claude-code, cursor, windsurf, opencode, codex, agents-md)
- `lib/actions/` — Next.js Server Actions (build, install, doctor, detect, skills, profiles, my-skills, local-skills, mcp)
- `skills/<domain>/<skill-name>/SKILL.md` — Source of truth for skills
- `profiles/*.yaml` — Profile definitions (skill compositions)
- `prompts/` — Autonomous maintenance prompts; `random_selector.md` chooses a safe prompt for small improvement runs
- `prompts/prompts_metadata.json` — Source-of-truth metadata for prompt eligibility, run counters, and terminal outcome tracking used by the random selector workflow.
- `issues_to_look/` — Investigation notes; use `YYYY-MM-DD_<short-slug>.md` naming; resolved notes move to `issues_to_look/resolved/`
- `dist/` — Built output (gitignored)
- `PRD.md` — Product Requirements Document
- `README.md` — Project overview and architecture diagram

## Autonomous Maintenance

- **Prompts**: `prompts/` contains instructions for autonomous agents. `random_selector.md` picks a safe task.
- **Metadata**: `prompts/prompts_metadata.json` tracks prompt usage and outcomes.
- **Issue Management**: Use `issues_to_look/` for deferred investigations. Use `YYYY-MM-DD_<short-slug>.md` naming.

## How to Add a Skill

1. Create `skills/<domain>/<skill-name>/SKILL.md`
2. Use YAML frontmatter + markdown body:

```markdown
---
name: my-skill-name
description: >
  What this skill teaches AI agents.
domain: my-domain
version: 1.0.0
tags: [tag1, tag2]
author: your-name
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
globs: "src/**/*.ts"
depends_on: [other-skill]
---

# Skill content here (markdown)
```

**Rules:**
- Skill name: `[a-z0-9]+(-[a-z0-9]+)*` — must match directory name
- Domain: lowercase with hyphens (e.g., `python`, `code-review`, `devops`)
- Supporting files (examples, templates) go alongside SKILL.md

## How to Add a Profile

Create `profiles/<name>.yaml`:

```yaml
name: my-profile
description: What this profile is for
extends: base-profile
include:
  - "*"
  - "python/*"
  - "*/lint"
  - "tag:security"
exclude: []
tools:
  claude-code:
    enabled: true
    global_skills: true
  cursor:
    enabled: true
    max_rule_length: 5000
```

**Rules:**
- Profile and Tool configs are strictly enforced (no extra fields).
- Patterns are case-insensitive: `*`, `tag:name`, `domain/*`, `*/skill`, or exact `domain/skill`.
- Profile name: `[a-z0-9]+(-[a-z0-9]+)*`
- Filename must be `<profile-name>.yaml` and match internal `name`

## How to Add an Adapter

1. Create `lib/adapters/<tool>.ts`
2. Import `BaseAdapter` from `./base` (**not** `./index` — circular dep)
3. Implement: `translateSkill`, `translateGlobal`, `getGlobalSymlinkTargets`, `getProjectSymlinkTargets`, `getCharacterLimit(scope)`
4. Register in `lib/adapters/index.ts` and add tool ID to `lib/types.ts`

## MCP Server Management

Supports Claude Code, Cursor, Windsurf, and Codex. Manage (add/edit/remove/copy) stdio, SSE, and HTTP servers with health checks and bulk export/import.

## Key Conventions

- Server Actions: `"use server"` in `lib/actions/`
- Client Components: `"use client"` — keep as leaf nodes
- All file writes use `atomicWrite()` from `lib/safety.ts` (temp + rename)
- Backups go to `~/.agent-toolkit-backup/`
- Character Limits: Validate size with `checkCharacterLimit()`. Windsurf: 6K (global) / 12K (workspace); Codex: 32 KiB (global).
- Adapter imports: always `BaseAdapter` from `./base`, never `./index`
- No bare `fs.writeFile` — use `atomicWrite` for safety
