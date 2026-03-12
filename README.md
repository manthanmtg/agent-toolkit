# Agent Toolkit

A Next.js 15 webapp for managing AI coding agent skills and configurations. Build once, deploy to **Claude Code**, **Cursor**, **Windsurf**, **OpenCode**, and **Codex** — with an extensible adapter pattern for adding more tools.

## What It Does

- **Skills** — Write reusable AI agent instructions in Markdown with YAML frontmatter
- **Profiles** — Compose skill sets for different use cases (e.g., "python-only", "full-stack")
- **Adapters** — Automatically translate skills into each tool's native format
- **Build & Link** — Generate output files and symlink them into each tool's config directory
- **Safety** — Atomic writes, backups, duplicate detection, manifest tracking

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Actions, Turbopack) |
| Language | TypeScript (strict) |
| UI | React 19, TailwindCSS 4, Lucide icons |
| Validation | Zod |
| Toasts | sonner |

## Project Structure

```
app/                  Pages (App Router)
lib/                  Core logic
  types.ts            Zod schemas, shared types
  registry.ts         Load skills & profiles from disk
  builder.ts          Build output files per adapter
  linker.ts           Symlink management
  detector.ts         Detect installed AI tools
  doctor.ts           Health diagnostics
  safety.ts           Atomic writes, backups, dedup
  adapters/           Tool-specific translators
    base.ts           Abstract BaseAdapter
    claude-code.ts    Claude Code
    cursor.ts         Cursor
    windsurf.ts       Windsurf
    opencode.ts       OpenCode
    codex.ts          Codex
    agents-md.ts      AGENTS.md (cross-tool)
  actions/            Next.js Server Actions
skills/               Skill definitions (source of truth)
profiles/             Profile YAML files
dist/                 Built output (gitignored)
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — skill count, profiles, detected tools, health |
| `/skills` | Browse skills grouped by domain |
| `/skills/[domain]/[name]` | Skill detail — metadata, activation, content |
| `/skills/new` | Create a new skill |
| `/add-skill` | Deploy skills to selected tools |
| `/install` | Guided wizard — detect → profile → build & link |
| `/doctor` | Health checks + tool detection |
| `/profiles` | Profile management |
| `/projects` | Link skills to project directories |
| `/mcp` | MCP server configuration |
| `/settings` | Toolkit info and configuration |

## Adding a Skill

Create `skills/<domain>/<skill-name>/SKILL.md`:

```markdown
---
name: my-skill
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

# Skill content in markdown
```

**Naming:** `[a-z0-9]+(-[a-z0-9]+)*` — must match directory name.

## Adding a Profile

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

## Adding an Adapter

1. Create `lib/adapters/<tool>.ts`
2. Import `BaseAdapter` from `./base` (not `./index`)
3. Implement: `translateSkill`, `translateGlobal`, `getGlobalSymlinkTargets`, `getProjectSymlinkTargets`, `getCharacterLimit`
4. Register in `lib/adapters/index.ts` and add tool ID to `lib/types.ts`

## Supported Tools

| Tool | Global Skills | Project Skills | Format |
|------|--------------|---------------|--------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` | SKILL.md with frontmatter |
| Cursor | `~/.cursor/rules/` | `.cursor/rules/` | .mdc with frontmatter |
| Windsurf | `~/.codeium/windsurf/memories/` | `.windsurf/rules/` | .md with trigger frontmatter |
| OpenCode | `~/.config/opencode/skills/` | `.opencode/skills/` | SKILL.md with frontmatter |
| Codex | `~/.codex/` | project root | AGENTS.md sections |

## Safety Features

- **Atomic writes** — temp file + `fs.rename` prevents partial writes
- **Backups** — existing files backed up to `~/.agent-toolkit-backup/` before modification
- **Duplicate detection** — checks for toolkit ownership markers before overwriting
- **Manifest tracking** — tracks all deployed files with checksums
- **AGENTS.md section markers** — safe merge without clobbering existing content
- **Character limit enforcement** — per-tool limits (e.g., Windsurf 12k, Codex 32KB)

## License

MIT
