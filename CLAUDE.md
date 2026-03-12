# Agent Toolkit — Repository Guide

This is a **Next.js 15 fullstack webapp** that manages AI coding agent skills and configurations. It builds, translates, and deploys skill files to 5 supported tools: Claude Code, Cursor, Windsurf, OpenCode, and Codex.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Turbopack)
- **Language**: TypeScript (strict)
- **UI**: React 19, TailwindCSS 4, Lucide icons, sonner (toasts)
- **Validation**: Zod
- **Build tool**: Turbopack (via `npm run dev`)

## Project Structure

```
app/                  → Next.js pages (App Router)
  page.tsx            → Dashboard
  skills/             → /skills, /skills/[domain]/[name], /skills/new
  install/            → Install wizard
  doctor/             → Health diagnostics
  profiles/           → Profile management
  ...
lib/                  → Core logic (server-side)
  types.ts            → Zod schemas, TypeScript types
  registry.ts         → Load skills & profiles from disk
  builder.ts          → Build output files per adapter
  linker.ts           → Create/remove symlinks
  detector.ts         → Detect installed AI tools
  doctor.ts           → Diagnostic checks
  safety.ts           → Atomic writes, backups, duplicate detection
  adapters/           → Tool-specific translators
    base.ts           → Abstract BaseAdapter class
    claude-code.ts    → Claude Code adapter
    cursor.ts         → Cursor adapter
    windsurf.ts       → Windsurf adapter
    opencode.ts       → OpenCode adapter
    codex.ts          → Codex adapter
    agents-md.ts      → AGENTS.md cross-tool adapter
  actions/            → Next.js Server Actions
skills/               → Source of truth — skill markdown files
  <domain>/
    <skill-name>/
      SKILL.md        → Skill definition (YAML frontmatter + markdown body)
profiles/             → YAML profile definitions
dist/                 → Built output (gitignored)
```

## How to Add a Skill

1. Create a directory: `skills/<domain>/<skill-name>/`
2. Create `SKILL.md` inside it with this format:

```markdown
---
name: my-skill-name
description: >
  A concise description of what this skill teaches AI agents.
domain: my-domain
version: 1.0.0
tags: [tag1, tag2]
author: your-name
activation:
  claude-code: model       # model | user-only | both
  cursor: auto             # auto | always | glob | manual
  windsurf: model_decision # always_on | model_decision | glob | manual
  opencode: model          # model
  codex: auto              # auto
---

# Skill Title

Your skill content in markdown. This is what gets deployed to AI tools
as instructions/rules/skills.
```

**Naming rules:**
- Skill name: lowercase alphanumeric with hyphens (`[a-z0-9]+(-[a-z0-9]+)*`)
- Domain: lowercase with hyphens (e.g., `python`, `code-review`, `devops`)
- Name must match the directory name

**Supporting files:** Place any examples, templates, or scripts alongside SKILL.md in the same directory. They'll be tracked as supporting files.

## How to Add a Profile

Create a YAML file in `profiles/`:

```yaml
name: my-profile
description: What this profile is for
include:
  - "python/*"       # glob patterns matching domain/skill-name
  - "devops/*"
exclude:
  - "python/legacy-*"
tools:
  claude-code:
    enabled: true
  cursor:
    enabled: true
  windsurf:
    enabled: false   # disable specific tools
```

## How to Add an Adapter

1. Create `lib/adapters/<tool-name>.ts`
2. Import `BaseAdapter` from `./base` (NOT from `./index` — avoids circular deps)
3. Implement all abstract methods: `translateSkill`, `translateGlobal`, `getGlobalSymlinkTargets`, `getProjectSymlinkTargets`, `getCharacterLimit`
4. Register it in `lib/adapters/index.ts` (import + add to `getAllAdapters()`)
5. Add the tool ID to `TOOL_IDS` and `TOOL_LABELS` in `lib/types.ts`

## Key Conventions

- **Server Actions** use `"use server"` directive and live in `lib/actions/`
- **Client Components** use `"use client"` directive — keep them as leaf nodes
- **Safety first**: All file writes go through `atomicWrite()` in `lib/safety.ts`
- **No bare fs.writeFile**: Use `atomicWrite` (temp file + rename) for safety
- **Backups**: Files are backed up to `~/.agent-toolkit-backup/` before modification
- **Duplicate detection**: Check for existing content before writing with `checkDuplicate()`
- **Imports in adapters**: Always import `BaseAdapter` from `./base`, never from `./index`

## Running

```bash
npm install
npm run dev     # starts at http://localhost:3000
```
