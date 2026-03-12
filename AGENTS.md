# Agent Toolkit — Repository Guide

This is a **Next.js 15 fullstack webapp** that manages AI coding agent skills and configurations. It builds, translates, and deploys skill files to 5 supported tools: Claude Code, Cursor, Windsurf, OpenCode, and Codex.

## Tech Stack

- Next.js 15 (App Router, Server Actions, Turbopack)
- TypeScript (strict), React 19, TailwindCSS 4, Lucide icons, Zod
- Run with: `npm install && npm run dev` → http://localhost:3000

## Project Structure

- `app/` — Next.js pages (App Router)
- `lib/` — Core logic: types, registry, builder, linker, detector, doctor, safety
- `lib/adapters/` — Tool-specific translators (claude-code, cursor, windsurf, opencode, codex, agents-md)
- `lib/actions/` — Next.js Server Actions (build, install, sync, doctor, detect, skills, profiles)
- `skills/<domain>/<skill-name>/SKILL.md` — Source of truth for skills
- `profiles/*.yaml` — Profile definitions (skill compositions)
- `dist/` — Built output (gitignored)

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
include:
  - "python/*"
  - "devops/*"
exclude: []
tools:
  claude-code:
    enabled: true
  cursor:
    enabled: true
```

## How to Add an Adapter

1. Create `lib/adapters/<tool>.ts`
2. Import `BaseAdapter` from `./base` (**not** `./index` — circular dep)
3. Implement: `translateSkill`, `translateGlobal`, `getGlobalSymlinkTargets`, `getProjectSymlinkTargets`, `getCharacterLimit`
4. Register in `lib/adapters/index.ts` and add tool ID to `lib/types.ts`

## Key Conventions

- Server Actions: `"use server"` in `lib/actions/`
- Client Components: `"use client"` — keep as leaf nodes
- All file writes use `atomicWrite()` from `lib/safety.ts` (temp + rename)
- Backups go to `~/.agent-toolkit-backup/`
- Adapter imports: always `BaseAdapter` from `./base`, never `./index`
- No bare `fs.writeFile` — use `atomicWrite` for safety
