<div align="center">

# Agent Toolkit

**Write skills once. Deploy everywhere.**

Build, manage, and deploy AI coding agent skills across
**Claude Code** · **Cursor** · **Windsurf** · **OpenCode** · **Codex**

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

## Why Agent Toolkit?

Every AI coding tool has its own format for instructions — `.mdc` files, `SKILL.md`, `AGENTS.md`, global rules, project rules. Keeping them in sync is painful.

Agent Toolkit solves this. You write a skill **once** as a Markdown file, and the toolkit translates and deploys it to every tool you use — handling format differences, activation modes, character limits, and file placement automatically.

## Features

- **Universal Skills** — Write Markdown + YAML frontmatter, deploy to 5+ tools
- **Adapter System** — Each tool gets its native format (`.mdc`, `SKILL.md`, `AGENTS.md`, etc.)
- **My Skills Dashboard** — See what's deployed where, detect drift, update outdated skills in one click
- **Cross-Agent Discovery** — Skills deployed to Claude Code are automatically visible in Cursor & Windsurf
- **Profiles** — Compose skill sets per use case (e.g., "python-only", "full-stack")
- **Install Wizard** — Guided flow to detect tools, pick a profile, build & link
- **Safety First** — Atomic writes, backups to `~/.agent-toolkit-backup/`, duplicate detection
- **Health Diagnostics** — Doctor page checks tool detection, file integrity, and config issues
- **Autonomous maintenance prompts** — `prompts/random_selector.md` picks safe one-shot improvement prompts for small documentation and workflow updates

## Quick Start

```bash
git clone https://github.com/manthanmtg/agent-toolkit.git
cd agent-toolkit
npm install
npm run dev
```

Common maintenance commands:

```bash
npm run build   # production build
npm run lint    # lint checks
npm run test    # run Vitest
npm run start   # run the built app
```

Open [http://localhost:3000](http://localhost:3000).

## Skill Library

19 production-ready skills across 14 domains:

| Domain | Skill | Description |
|--------|-------|-------------|
| **ci-cd** | `pipeline-hardening` | Reliable pipelines, safe deploys, caching, release checks |
| **code-review** | `deep-review` | Deep review focused on bugs, security, performance, resilience |
| **code-review** | `multi-agent-regression` | Multi-agent regression review for behavior breakage and backward-compatibility risk |
| **code-review** | `multi-agent-review` | Run multiple AI reviewers to analyze a branch or commit |
| **debugging** | `root-cause-debugging` | Analyze logs, traces, stack traces, and state to find root causes |
| **devops** | `docker-best-practices` | Efficient, secure, reproducible container images |
| **docs-gen** | `engineering-docs` | READMEs, API docs, runbooks, changelogs, migration guides |
| **frontend** | `frontend-design` | Create production-grade frontend UI with strong aesthetics and implementation quality |
| **frontend** | `frontend-review` | Review frontend code for design, accessibility, responsiveness, and performance |
| **git-pro** | `perfect-commits` | Precise commits, reviewable PRs, clean rebases |
| **perf-opt** | `performance-tuning` | Profiling, bottleneck analysis, query optimization |
| **planning** | `design-architect` | Architect code changes by analyzing branches, schemas, and requirements |
| **planning** | `design-reviewer` | Review implementation plans for completeness, risk, and feasibility |
| **productivity-work** | `weekly-work-review` | Weekly summary from Slack + Jira + Confluence activity |
| **python** | `error-handling` | Custom exceptions, context managers, structured logging, retries |
| **python** | `pydantic-patterns` | Pydantic v2 validators, serialization, generics, unions |
| **security-scan** | `appsec-review` | OWASP risks, secrets exposure, dependency audits |
| **testing-master** | `test-strategy` | TDD, coverage strategy, regression tests, mocks, fixtures |
| **typescript** | `nextjs-patterns` | Next.js 15 App Router, Server Components, Server Actions |

## Supported Tools

| Tool | Deployment | Global Path | Project Path | Format |
|------|-----------|-------------|--------------|--------|
| **Claude Code** | Per-skill | `~/.claude/skills/` | `.claude/skills/` | `SKILL.md` |
| **Cursor** | Per-skill | `~/.cursor/skills/` | `.cursor/rules/` | `SKILL.md` + `.mdc` |
| **Windsurf** | Per-skill + global rules | `~/.codeium/windsurf/memories/global_rules.md`, `~/.codeium/windsurf/skills/` | `.windsurf/rules/` | `SKILL.md` + `.md` rules |
| **OpenCode** | Per-skill + global AGENTS | `~/.config/opencode/AGENTS.md`, `~/.config/opencode/skills/` | `.opencode/skills/` | `SKILL.md` |
| **Codex** | Bundled | `~/.codex/` | Project root | `AGENTS.md` (merged) |

> **Cross-agent compatibility:** Cursor and Windsurf automatically discover skills in `~/.claude/skills/`. Deploy once to Claude Code, use everywhere.

## Pages

| Route | What it does |
|-------|-------------|
| `/` | Dashboard — skill count, profiles, detected tools, health summary |
| `/skills` | Browse all skills grouped by domain |
| `/skills/[domain]/[name]` | Skill detail — metadata, activation config, rendered content |
| `/skills/new` | Create a new skill with the guided editor |
| `/my-skills` | Deployed skills per tool — drift detection, update, add, cross-agent view |
| `/add-skill` | Deploy selected skills to chosen tools |
| `/install` | Guided wizard — detect tools, pick profile, build & link |
| `/mcp` | Configure MCP server manifests, sync, and export skill/tool mappings |
| `/doctor` | Health diagnostics and tool detection |
| `/profiles` | Create and manage skill profiles |
| `/projects` | Link skills to specific project directories |
| `/settings` | Toolkit configuration and info |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│  Dashboard · Skills · My Skills · Install · ...  │
├─────────────────────────────────────────────────┤
│                 Server Actions                   │
│  build · sync · detect · my-skills · doctor      │
├─────────────────────────────────────────────────┤
│                  Core Library                    │
│  registry · builder · linker · safety · detector │
├──────┬──────┬──────┬──────┬──────┬──────────────┤
│Claude│Cursor│Winds.│Open  │Codex │ AGENTS.md    │
│ Code │      │      │ Code │      │  (cross)     │
└──────┴──────┴──────┴──────┴──────┴──────────────┘
         ▼          ▼         ▼         ▼
    ~/.claude/  ~/.cursor/ ~/.codeium/  ~/.codex/
```

## Writing a Skill

Create `skills/<domain>/<skill-name>/SKILL.md`:

```markdown
---
name: my-skill
description: >
  What this skill teaches AI agents.
domain: my-domain
version: 1.0.0
tags: [productivity, review]
author: your-name
activation:
  claude-code: model       # model | user-only | both
  cursor: auto             # auto | always | glob | manual
  windsurf: model_decision # always_on | model_decision | glob | manual
  opencode: model          # model
  codex: auto              # auto
---

# Skill Title

Your skill content in Markdown. This is what gets deployed
to AI tools as instructions.
```

**Naming rules:**
- Skill name: `[a-z0-9]+(-[a-z0-9]+)*` — must match directory name
- Domain: lowercase with hyphens (e.g., `python`, `code-review`)
- Place supporting files (examples, templates) alongside `SKILL.md`

## Creating a Profile

Create `profiles/<name>.yaml`:

```yaml
name: my-profile
description: Skills for Python backend work
include:
  - "python/*"
  - "testing-master/*"
  - "debugging/*"
exclude:
  - "typescript/*"
tools:
  claude-code:
    enabled: true
  cursor:
    enabled: true
  windsurf:
    enabled: false
```

## Adding an Adapter

1. Create `lib/adapters/<tool>.ts`
2. Import `BaseAdapter` from `./base` (never `./index` — avoids circular deps)
3. Implement: `translateSkill`, `translateGlobal`, `getGlobalSymlinkTargets`, `getProjectSymlinkTargets`, `getCharacterLimit`
4. Register in `lib/adapters/index.ts` and add tool ID to `lib/types.ts`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Actions, Turbopack) |
| Language | TypeScript (strict) |
| UI | React 19, TailwindCSS 4, Lucide icons |
| Validation | Zod |
| Toasts | sonner |
| Testing | Vitest, React Testing Library |

## Safety

| Feature | How |
|---------|-----|
| Atomic writes | Write to temp file, then `fs.rename` — no partial writes |
| Backups | Existing files saved to `~/.agent-toolkit-backup/` before overwrite |
| Duplicate detection | Checks for toolkit ownership markers before writing |
| Manifest tracking | Tracks all deployed files with content checksums |
| Section markers | `AGENTS.md` merge without clobbering existing content |
| Character limits | Per-tool enforcement (e.g., Windsurf 12K, Codex 32KB) |

## Project Structure

```
app/                  Next.js pages (App Router)
  my-skills/          Deployed skills dashboard
  skills/             Skill browser + detail + editor
  install/            Install wizard
  doctor/             Health diagnostics
lib/                  Core logic
  types.ts            Zod schemas, shared types
  registry.ts         Load skills & profiles from disk
  builder.ts          Build output files per adapter
  linker.ts           Symlink management
  detector.ts         Detect installed AI tools
  doctor.ts           Diagnostic checks
  safety.ts           Atomic writes, backups, dedup
  adapters/           Tool-specific translators
  actions/            Next.js Server Actions
skills/               Source of truth — skill Markdown files
profiles/             Profile YAML definitions
dist/                 Built output (gitignored)
```

## License

[MIT](./LICENSE)
