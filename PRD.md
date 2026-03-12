# Agent Toolkit — Product Requirements Document

> A universal infrastructure layer that lets AI coding agents self-install, share, and evolve their own capabilities across every IDE, terminal, and machine you use.

---

## 1. Problem Statement

Every AI coding agent speaks a different dialect:

| Agent | Config format | Global path | Project path |
|-------|--------------|-------------|--------------|
| **Claude Code** | `SKILL.md` with YAML frontmatter | `~/.claude/skills/<name>/SKILL.md` | `.claude/skills/<name>/SKILL.md` |
| **Cursor** | `.mdc` / `.md` with frontmatter | Cursor Settings → Rules (UI) | `.cursor/rules/*.mdc` |
| **Windsurf** | `.md` with `trigger:` frontmatter | `~/.codeium/windsurf/memories/global_rules.md` | `.windsurf/rules/*.md` |
| **OpenCode** | `AGENTS.md` + `SKILL.md` dirs | `~/.config/opencode/AGENTS.md` | `AGENTS.md` + `.opencode/skills/<name>/SKILL.md` |
| **Codex** (OpenAI) | `AGENTS.md` + `config.toml` | `~/.codex/AGENTS.md` | `AGENTS.md` in any directory |
| **AGENTS.md** (cross-tool) | Plain markdown | — | `AGENTS.md` in any directory |

> **Extensibility**: The adapter architecture supports adding new tools (GitHub Copilot, Roo Code, Continue, Aider, etc.) by implementing a single adapter file. No changes to skills or profiles required.

This fragmentation creates four compounding problems:

1. **Tool lock-in** — A Spark optimization prompt written for Claude Code is invisible to Cursor, Windsurf, OpenCode, and Codex. You rewrite the same knowledge for each tool.
2. **Knowledge rot** — Prompts live as scattered files copy-pasted across projects. Improvements never propagate. Skills decay silently.
3. **Painful onboarding** — New machine = manually recreating your entire AI brain: MCP servers, API keys, global rules, per-project configs, skills directories.
4. **No feedback loop** — When you discover a better pattern mid-session, there is no mechanism for agents to update their own skill set in a way that persists and propagates.

**The goal is not to store text files. It is to build infrastructure so every agent you use can self-install its own capabilities — and evolve them over time.**

---

## 2. Vision

```bash
git clone git@github.com:manthanmtg/agent-toolkit.git
cd agent-toolkit && npm install
npm run dev
# Open http://localhost:3000 → guided setup wizard
```

A rich local webapp. Every agent on your machine — Claude Code, Cursor, Windsurf, OpenCode, Codex — is configured with the same skills, the same conventions, the same MCP servers. On any machine. In any project.

---

## 3. Target Users

- **Primary**: Manthan — data engineer at Atlan, working across Spark/Iceberg/Python/FastAPI, using multiple AI agents daily across work and personal projects.
- **Secondary**: Any developer using 2+ AI coding tools who wants one repo to rule them all.
- **Tertiary**: Teams that want to distribute a shared "AI coding standard" to all engineers.

---

## 4. Agent Compatibility Reference

This is the ground truth for how each tool consumes instructions. The toolkit must target **every path and format** listed here.

### 4.1 Claude Code

| Scope | Path | Format |
|-------|------|--------|
| Global skills | `~/.claude/skills/<skill-name>/SKILL.md` | Markdown + YAML frontmatter (`name`, `description`, `disable-model-invocation`, `allowed-tools`, `context`, `user-invocable`) |
| Project skills | `.claude/skills/<skill-name>/SKILL.md` | Same as above |
| Global instructions | `~/.claude/CLAUDE.md` | Plain markdown |
| Project instructions | `CLAUDE.md` in repo root | Plain markdown |
| MCP config | `~/.claude/mcp.json` or `.claude/mcp.json` | JSON |

**Key details**:
- Each skill is a **directory** containing `SKILL.md` (required) plus optional supporting files (`template.md`, `examples/`, `scripts/`).
- Skills support `$ARGUMENTS`, `$ARGUMENTS[N]`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}` substitutions.
- Skills can be invoked by `/skill-name` (user) or automatically by Claude (model-invoked).
- Skills from additional directories can be loaded via `--add-dir` flag.

### 4.2 Cursor

| Scope | Path | Format |
|-------|------|--------|
| User rules | Cursor Settings → Rules (UI only) | Plain text |
| Project rules | `.cursor/rules/*.mdc` or `.cursor/rules/*.md` | Markdown + frontmatter (`description`, `alwaysApply`, `globs`) |
| Team rules | Cursor Dashboard (cloud) | Plain text + optional glob patterns |
| Cross-tool | `AGENTS.md` in project root or subdirectories | Plain markdown (no frontmatter) |

**Key details**:
- `alwaysApply: true` → always injected. `alwaysApply: false` → agent decides based on `description`.
- Supports `@filename.ts` references inside rules to include file context.
- Supports importing remote rules from GitHub repos.
- Rules precedence: Team → Project → User.

### 4.3 Windsurf (Cascade)

| Scope | Path | Format |
|-------|------|--------|
| Global rules | `~/.codeium/windsurf/memories/global_rules.md` | Single markdown file, always on. Max 6,000 chars. |
| Workspace rules | `.windsurf/rules/*.md` | Markdown + frontmatter (`trigger`: `always_on` / `model_decision` / `glob` / `manual`, `description`, `globs`) |
| Skills | `.windsurf/skills/<skill-name>/SKILL.md` | Markdown + frontmatter (`name`, `description`) |
| Workflows | `.windsurf/workflows/*.md` | Markdown + frontmatter (`description`) |
| Cross-tool | `AGENTS.md` in any directory | Processed by Rules engine — root = always-on, subdirectory = auto-glob |
| System rules (Enterprise) | `/etc/windsurf/rules/` (Linux), OS-specific | IT-deployed, read-only |
| MCP config | `~/.codeium/windsurf/mcp_config.json` | JSON |

**Key details**:
- Workspace rules max 12,000 chars each.
- Windsurf discovers rules from current workspace, subdirectories, and up to git root.
- Skills are a separate concept from rules — skills are invokable units (like Claude Code skills).

### 4.4 OpenCode

| Scope | Path | Format |
|-------|------|--------|
| Global rules | `~/.config/opencode/AGENTS.md` | Plain markdown |
| Project rules | `AGENTS.md` in repo root | Plain markdown (fallback: `CLAUDE.md`) |
| Global skills | `~/.config/opencode/skills/<name>/SKILL.md` | Markdown + YAML frontmatter (`name`, `description`, `license`, `compatibility`, `metadata`) |
| Project skills | `.opencode/skills/<name>/SKILL.md` | Same as above |
| Claude-compat skills | `~/.claude/skills/<name>/SKILL.md` or `.claude/skills/<name>/SKILL.md` | Claude Code SKILL.md format (auto-detected) |
| Agent-compat skills | `~/.agents/skills/<name>/SKILL.md` or `.agents/skills/<name>/SKILL.md` | Same SKILL.md format |
| Custom instructions | `opencode.json` → `"instructions": [...]` | JSON (supports local files, globs, remote URLs) |
| Config | `opencode.json` or `~/.config/opencode/opencode.json` | JSON |

**Key details**:
- OpenCode walks up from CWD to git worktree root, loading `AGENTS.md` (or `CLAUDE.md` fallback) at each level.
- Skills are loaded **on-demand** via a native `skill` tool — agents see available skills and load full content when needed.
- Skill name validation: 1–64 chars, lowercase alphanumeric + hyphens, must match directory name. Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- Description max: 1,024 chars.
- Supports skill permissions in `opencode.json`: `"permission": { "skill": { "*": "allow", "internal-*": "deny" } }`.
- Full Claude Code compatibility: reads `~/.claude/CLAUDE.md`, `~/.claude/skills/`, `CLAUDE.md`. Disable via `OPENCODE_DISABLE_CLAUDE_CODE=1`.
- Precedence: Local `AGENTS.md` → Global `~/.config/opencode/AGENTS.md` → Claude Code fallback `~/.claude/CLAUDE.md`.

### 4.5 Codex (OpenAI)

| Scope | Path | Format |
|-------|------|--------|
| Global instructions | `~/.codex/AGENTS.md` | Plain markdown |
| Global overrides | `~/.codex/AGENTS.override.md` | Plain markdown (takes precedence over `AGENTS.md`) |
| Project instructions | `AGENTS.md` in repo root or any directory | Plain markdown |
| Project overrides | `AGENTS.override.md` in any directory | Plain markdown (takes precedence over `AGENTS.md` in same dir) |
| Config | `~/.codex/config.toml` | TOML |

**Key details**:
- Discovery chain: Global (`~/.codex/`) → project root → each directory down to CWD. At most one file per directory.
- In each directory: `AGENTS.override.md` is checked first, then `AGENTS.md`, then fallback filenames from `project_doc_fallback_filenames` in config.
- Files are concatenated root-down; later files (closer to CWD) override earlier guidance.
- Max combined size: `project_doc_max_bytes` (default 32 KiB, configurable in `config.toml`).
- Fallback filenames configurable: `project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]`.
- `CODEX_HOME` env var overrides the default `~/.codex` directory.
- Codex itself can run as an MCP server over stdio.

### 4.6 AGENTS.md (Cross-Tool Standard)

Supported by: **all 5 tools** — Claude Code (as `CLAUDE.md`), Cursor, Windsurf, OpenCode, Codex.

| Scope | Path | Format |
|-------|------|--------|
| Project-wide | `AGENTS.md` in repo root | Plain markdown |
| Directory-scoped | `AGENTS.md` in any subdirectory | Plain markdown |

**Key details**:
- No frontmatter — just plain markdown with headers and lists.
- Nested `AGENTS.md` files are combined, with more specific instructions taking precedence.
- The closest thing to a universal standard across tools.
- OpenCode and Codex use `AGENTS.md` as their primary instruction format; Cursor and Windsurf process it through their rules engines.

### 4.7 Extensibility — Future Tool Support

The adapter architecture is designed so adding a new tool requires only one new adapter file. Tools researched for future support:

| Tool | Global path | Project path | Effort |
|------|------------|--------------|--------|
| **GitHub Copilot** | VS Code Settings (UI) | `.github/copilot-instructions.md` | Low — plain markdown concat |
| **Roo Code / Cline** | `~/.roo/rules/*.md` | `.roo/rules/*.md` or `.clinerules/` | Medium — per-mode directories |
| **Continue** | `~/.continue/rules/*.md` | `.continue/rules/*.md` | Low — plain markdown files |
| **Aider** | `~/.aider.conf.yml` | `CONVENTIONS.md` | Low — single file concat |

---

## 5. Architecture

### 5.1 Core Concepts

#### Skill (Source of Truth)
A **skill** is a self-contained unit of knowledge stored once in this repo. Every tool-specific config is **derived** from skills, never hand-maintained separately.

Skills live in `skills/<domain>/<skill-name>/` and contain:
```
skills/data-engineering/spark-optimization/
├── SKILL.md          # The actual knowledge (required)
├── examples/         # Optional example files
│   └── partition-pruning-example.py
├── scripts/          # Optional executable scripts
│   └── check-aqe.sh
└── templates/        # Optional template files
    └── spark-job-template.py
```

The `SKILL.md` uses a **superset frontmatter** that covers metadata for all tools:

```markdown
---
name: spark-optimization
description: >
  Best practices for Apache Spark job tuning including partition pruning,
  AQE configuration, join optimization, and Iceberg-specific patterns.
domain: data-engineering
version: 1.2.0
tags: [spark, performance, iceberg, aqe]
author: manthan

# Activation behavior per tool
activation:
  claude-code: model     # model | user-only | both
  cursor: auto          # auto | always | glob | manual
  windsurf: model_decision  # always_on | model_decision | glob | manual
  opencode: model        # model (on-demand via skill tool)
  codex: auto            # auto (concatenated into AGENTS.md)

# Optional constraints
globs: "**/*.py,**/*.scala"
depends_on:
  - data-engineering/iceberg-table-maintenance
---

# Spark Optimization Patterns

## Partition Pruning
Always filter on partition columns before any join or aggregation...

## Adaptive Query Execution (AQE)
Enable AQE and configure these settings...
```

#### Profile (Composition Layer)
A **profile** selects which skills to deploy and how. Profiles enable different skill sets for work vs personal vs review contexts.

#### Adapter (Translation Layer)
An **adapter** translates skills into tool-specific formats. Each tool has an adapter that understands the target format, path conventions, frontmatter requirements, and character limits.

#### Webapp (Wiring Layer)
A Next.js fullstack app (`localhost:3000`) is the primary interface. Server Actions handle all filesystem operations: skill building, symlink management, MCP server setup, safety checks. The UI provides rich interactive flows — skill browser, tool-target picker, live diagnostics, markdown preview, and visual diffs.

### 5.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        agent-toolkit repo                           │
│                                                                     │
│  skills/              profiles/         lib/adapters/                │
│  ├── data-eng/        ├── work.yaml     ├── claude-code.ts          │
│  ├── python/          ├── personal.yaml ├── cursor.ts               │
│  ├── devops/          └── review.yaml   ├── windsurf.ts             │
│  └── general/                           ├── opencode.ts             │
│                                         ├── codex.ts                │
│                                         └── agents-md.ts            │
│                                                                     │
│           ┌──────────────────────────────────┐                      │
│           │      Next.js Server Actions       │                     │
│           │  (reads skills + profile → runs   │                     │
│           │   adapters → writes dist/)        │                     │
│           └──────────────┬───────────────────┘                      │
│                          │                                          │
│           ┌──────────────▼───────────────────┐                      │
│           │          dist/ (generated)         │                     │
│           │  ├── claude-code/                  │                     │
│           │  │   ├── skills/spark-optimization/ │                    │
│           │  │   │   └── SKILL.md              │                     │
│           │  │   └── CLAUDE.md                 │                     │
│           │  ├── cursor/                       │                     │
│           │  │   └── rules/                    │                     │
│           │  │       └── spark-optimization.mdc │                    │
│           │  ├── windsurf/                     │                     │
│           │  │   ├── rules/                    │                     │
│           │  │   │   └── spark-optimization.md │                     │
│           │  │   └── skills/spark-optimization/ │                    │
│           │  │       └── SKILL.md              │                     │
│           │  ├── opencode/                     │                     │
│           │  │   ├── skills/spark-optimization/ │                    │
│           │  │   │   └── SKILL.md              │                     │
│           │  │   └── AGENTS.md                 │                     │
│           │  ├── codex/                        │                     │
│           │  │   └── AGENTS.md                 │                     │
│           │  └── agents-md/                    │                     │
│           │      └── AGENTS.md                 │                     │
│           └──────────────────────────────────┘                      │
│                                                                     │
│           ┌──────────────────────────────────┐                      │
│           │      lib/linker.ts (safety.ts)    │                     │
│           │  (symlinks dist/ → tool paths,    │                     │
│           │   JSON merge, backup, rollback)   │                     │
│           └──────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────────────┐
          ▼                ▼                         ▼
  ~/.claude/skills/   ~/.codeium/windsurf/    ~/.config/opencode/
  ~/.claude/CLAUDE.md  memories/global_rules.md  skills/
                       .windsurf/rules/       ~/.codex/AGENTS.md
```

---

## 6. Directory Layout

```
.
├── PRD.md
├── README.md
├── package.json                    # Next.js + deps
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── toolkit.yaml                    # Global toolkit configuration
│
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout (sidebar nav, theme)
│   ├── page.tsx                    # Dashboard: detected tools, skill count, health status
│   │
│   ├── install/
│   │   └── page.tsx                # Guided setup wizard (multi-step)
│   │
│   ├── skills/
│   │   ├── page.tsx                # Skill browser: grid/list, filter by domain/tag, search
│   │   ├── [domain]/
│   │   │   └── [name]/
│   │   │       └── page.tsx        # Skill detail: markdown preview, frontmatter editor,
│   │   │                           #   per-tool activation toggles, install targets
│   │   └── new/
│   │       └── page.tsx            # New skill form: domain, name, description, template
│   │
│   ├── add-skill/
│   │   └── page.tsx                # Add skill flow: pick skill → pick tools → pick scope
│   │                               #   → safety checks → confirm → link
│   │
│   ├── profiles/
│   │   ├── page.tsx                # Profile list + editor
│   │   └── [name]/
│   │       └── page.tsx            # Profile detail: included skills, tool toggles, diff preview
│   │
│   ├── projects/
│   │   ├── page.tsx                # Linked projects list
│   │   └── link/
│   │       └── page.tsx            # Link project: pick path → pick profile → preview → link
│   │
│   ├── doctor/
│   │   └── page.tsx                # Live health dashboard: symlinks, tools, MCP, schema
│   │
│   ├── mcp/
│   │   └── page.tsx                # MCP server manager: install, status, config viewer
│   │
│   └── settings/
│       └── page.tsx                # API keys, env vars, backup management
│
├── components/                     # Shared React components
│   ├── ui/                         # shadcn/ui components
│   ├── skill-card.tsx              # Skill card (grid view)
│   ├── tool-target-picker.tsx      # Multi-select: tool × scope (global/project)
│   ├── safety-check-panel.tsx      # Real-time safety check results
│   ├── markdown-preview.tsx        # Live SKILL.md preview
│   ├── diff-viewer.tsx             # Side-by-side diff for skill changes
│   ├── install-wizard.tsx          # Multi-step install wizard
│   └── terminal-output.tsx         # Streaming terminal-style output for build/install
│
├── lib/                            # Core logic (server-side TypeScript)
│   ├── types.ts                    # Zod schemas + TypeScript types: Skill, Profile, OutputFile
│   ├── registry.ts                 # Discovers and loads skills from skills/
│   ├── builder.ts                  # Reads profile + skills → runs adapters → dist/
│   ├── linker.ts                   # Symlink management (create, verify, remove, backup)
│   ├── detector.ts                 # Detects installed AI tools on the system
│   ├── doctor.ts                   # Diagnostic checks (symlinks, MCP, schema)
│   ├── mcp.ts                      # MCP server install + config generation
│   ├── safety.ts                   # JSON merge safety, duplicate detection, backup/rollback
│   │
│   ├── adapters/                   # Tool-specific translation logic
│   │   ├── index.ts                # Adapter registry + BaseAdapter interface
│   │   ├── claude-code.ts          # → SKILL.md dirs + CLAUDE.md
│   │   ├── cursor.ts               # → .cursor/rules/*.mdc
│   │   ├── windsurf.ts             # → .windsurf/rules/*.md + skills/
│   │   ├── opencode.ts             # → .opencode/skills/ + AGENTS.md
│   │   ├── codex.ts                # → ~/.codex/AGENTS.md
│   │   └── agents-md.ts            # → AGENTS.md (universal)
│   │
│   └── actions/                    # Next.js Server Actions
│       ├── install.ts              # Guided install flow
│       ├── add-skill.ts            # Add skill to tools
│       ├── build.ts                # Build dist/ from profile
│       ├── link.ts                 # Link/unlink projects
│       ├── sync.ts                 # Build + refresh links
│       ├── doctor.ts               # Run diagnostics
│       ├── mcp.ts                  # MCP server management
│       ├── new-skill.ts            # Scaffold new skill
│       └── uninstall.ts            # Clean teardown
│
├── skills/                         # === SOURCE OF TRUTH ===
│   ├── _schema.json                # JSON Schema for SKILL.md frontmatter
│   ├── data-engineering/
│   │   ├── spark-optimization/
│   │   │   ├── SKILL.md
│   │   │   └── examples/
│   │   ├── iceberg-table-maintenance/
│   │   │   └── SKILL.md
│   │   ├── delta-lake-patterns/
│   │   │   └── SKILL.md
│   │   └── dbt-conventions/
│   │       └── SKILL.md
│   ├── python/
│   │   ├── pydantic-patterns/
│   │   │   └── SKILL.md
│   │   ├── fastapi-scaffolding/
│   │   │   └── SKILL.md
│   │   ├── python-testing/
│   │   │   └── SKILL.md
│   │   └── python-docstrings/
│   │       └── SKILL.md
│   ├── devops/
│   │   ├── digitalocean-infra/
│   │   │   └── SKILL.md
│   │   ├── harness-pipelines/
│   │   │   └── SKILL.md
│   │   ├── docker-best-practices/
│   │   │   └── SKILL.md
│   │   └── atlan-workflows/
│   │       └── SKILL.md
│   └── general/
│       ├── code-review/
│       │   ├── SKILL.md
│       │   └── scripts/
│       ├── git-conventions/
│       │   └── SKILL.md
│       ├── multi-agent-review/
│       │   └── SKILL.md
│       └── security-audit/
│           └── SKILL.md
│
├── profiles/                       # Skill composition profiles
│   ├── default.yaml
│   ├── work.yaml
│   ├── personal.yaml
│   └── review.yaml
│
├── mcp/                            # MCP server configurations
│   ├── servers.yaml
│   ├── claude-code-mcp.json
│   ├── windsurf-mcp.json
│   └── cursor-mcp.json
│
├── dist/                           # Generated output (gitignored)
│   ├── claude-code/
│   ├── cursor/
│   ├── windsurf/
│   ├── opencode/
│   ├── codex/
│   └── agents-md/
│
├── overrides/                      # User-local overrides (gitignored)
│   └── .gitkeep
│
└── __tests__/
    ├── adapters.test.ts
    ├── builder.test.ts
    ├── linker.test.ts
    └── safety.test.ts
```

---

## 7. Functional Requirements

### 7.1 Skill Authoring & Schema

| ID | Requirement | Priority |
|----|-------------|----------|
| SK-1 | Each skill is a directory under `skills/<domain>/<skill-name>/` containing at minimum a `SKILL.md` | P0 |
| SK-2 | `SKILL.md` uses YAML frontmatter with fields: `name`, `description`, `domain`, `version`, `tags`, `author`, `activation`, `globs`, `depends_on` | P0 |
| SK-3 | The `activation` map specifies per-tool behavior (e.g., `cursor: auto`, `windsurf: always_on`, `claude-code: model`) | P0 |
| SK-4 | Skills can include supporting files: `examples/`, `scripts/`, `templates/` alongside `SKILL.md` | P1 |
| SK-5 | A JSON Schema (`skills/_schema.json`) validates all skill frontmatter | P1 |
| SK-6 | Skills can declare `depends_on` to reference other skills | P1 |
| SK-7 | `/doctor` page and build-time validation check all skills against the schema and report errors | P0 |

### 7.2 Adapters (Translation Layer)

Each adapter converts a skill into the tool's native format. All adapters implement a common interface:

```typescript
abstract class BaseAdapter {
  abstract translateSkill(skill: Skill, profile: Profile): OutputFile[]
  abstract translateGlobal(skills: Skill[], profile: Profile): OutputFile[]
  abstract getGlobalSymlinkTargets(): Map<string, string>   // dist path → system path
  abstract getProjectSymlinkTargets(): Map<string, string>   // dist path → project path
  abstract getCharacterLimit(): number | null
}
```

| ID | Requirement | Priority |
|----|-------------|----------|
| AD-1 | Core adapters exist for: Claude Code, Cursor, Windsurf, OpenCode, Codex, AGENTS.md | P0 |
| AD-2 | Claude Code adapter emits `<skill-name>/SKILL.md` directories with correct frontmatter (`name`, `description`, `disable-model-invocation`, `allowed-tools`) and copies supporting files | P0 |
| AD-3 | Cursor adapter emits `.mdc` files with `description` and `alwaysApply`/`globs` frontmatter | P0 |
| AD-4 | Windsurf adapter emits rule files with `trigger` frontmatter (`always_on`/`model_decision`/`glob`/`manual`) and optionally skill directories | P0 |
| AD-5 | OpenCode adapter emits `<skill-name>/SKILL.md` directories (compatible with Claude Code format) into `.opencode/skills/` and generates an `AGENTS.md` with concatenated skill summaries | P0 |
| AD-6 | Codex adapter generates `AGENTS.md` files with concatenated skill content (respects `project_doc_max_bytes` 32 KiB default) and optionally an `AGENTS.override.md` | P0 |
| AD-7 | AGENTS.md adapter generates a combined `AGENTS.md` from selected skills (universal cross-tool format) | P0 |
| AD-8 | All adapters respect tool-specific character/byte limits (Windsurf global: 6,000 chars, workspace rule: 12,000 chars; OpenCode skill description: 1,024 chars; Codex: 32 KiB combined) and emit warnings when exceeded | P1 |
| AD-9 | Adapters are idempotent — running twice produces identical output | P0 |
| AD-10 | Adding a new tool adapter requires implementing `BaseAdapter` — no changes to skills, profiles, or build system needed | P0 |

### 7.3 Profiles (Composition)

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-1 | Profiles are YAML files in `profiles/` that select skills by inclusion/exclusion patterns | P0 |
| PR-2 | `default.yaml` includes all skills | P0 |
| PR-3 | Profiles support per-tool settings (character limits, activation overrides, etc.) | P1 |
| PR-4 | Profiles support `exclude:` patterns by domain, tag, or specific skill path | P1 |
| PR-5 | Profiles can extend other profiles via `extends: base-profile` | P2 |

**Example:**

```yaml
# profiles/work.yaml
name: work
description: Atlan work environment
extends: default

include:
  - data-engineering/*
  - python/*
  - devops/harness-pipelines
  - devops/atlan-workflows
  - general/*

exclude:
  - devops/digitalocean-infra
  - devops/docker-best-practices

tools:
  claude-code:
    enabled: true
    global_skills: true       # install to ~/.claude/skills/
  cursor:
    enabled: true
    max_rule_length: 8000
  windsurf:
    enabled: true
    default_trigger: model_decision
  opencode:
    enabled: true
    global_skills: true       # install to ~/.config/opencode/skills/
  codex:
    enabled: true
    max_bytes: 32768           # project_doc_max_bytes limit
  agents-md:
    enabled: true
```

### 7.4 Build System

| ID | Requirement | Priority |
|----|-------------|----------|
| BU-1 | Build action reads the profile, loads matching skills, runs all enabled adapters, writes output to `dist/`. Triggered via UI "Build" button or `/install` wizard. | P0 |
| BU-2 | Build defaults to the `default` profile when none is selected | P0 |
| BU-3 | Build is incremental — only regenerates outputs for skills that changed (based on file mtime or git diff) | P2 |
| BU-4 | Build emits a manifest (`dist/.manifest.json`) listing all generated files, their source skills, and checksums | P1 |

### 7.5 Installation & Setup

| ID | Requirement | Priority |
|----|-------------|----------|
| BS-1 | `/install` page runs a **multi-step wizard**: detect tools → select profile → build → symlink → optionally install MCP → optionally setup env. Each step shows real-time progress. | P0 |
| BS-2 | `detector.ts` checks which AI tools are installed (binary on PATH, config dirs exist) and only configures those | P0 |
| BS-3 | `linker.ts` creates symlinks from `dist/` to each tool's global config path | P0 |
| BS-4 | Symlinks for each tool target the **exact paths** documented in Section 4 (e.g., `dist/claude-code/skills/* → ~/.claude/skills/*`) | P0 |
| BS-5 | Existing configs at target paths are backed up to `~/.agent-toolkit-backup/` before symlinking | P0 |
| BS-6 | `/mcp` page installs MCP servers listed in `mcp/servers.yaml` and generates MCP config files for each tool | P1 |
| BS-7 | `/settings` page manages API keys → writes `~/.agent-toolkit.env` (never logged, gitignored) | P1 |
| BS-8 | "Uninstall" action removes all symlinks, restores backups, and leaves no trace | P1 |
| BS-9 | "Sync" action = build + refresh symlinks (for after editing skills). Available as a one-click button on the dashboard. | P0 |
| BS-10 | `/doctor` page runs live diagnostics: checks symlinks are valid, tools detected, MCP servers running, schema valid | P1 |
| BS-11 | Every action is idempotent and safe to trigger multiple times | P0 |
| BS-12 | Server-side logic detects OS (macOS/Linux) and adjusts all paths accordingly | P1 |

### 7.6 Per-Project Linking

| ID | Requirement | Priority |
|----|-------------|----------|
| PP-1 | `/projects/link` page provides a guided flow: pick project path → pick profile → preview symlinks → confirm. | P0 |
| PP-2 | Per-project linking creates tool-specific project paths (`.claude/skills/`, `.cursor/rules/`, `.windsurf/rules/`, `.opencode/skills/`, `AGENTS.md`) | P0 |
| PP-3 | Linking auto-appends symlinked paths to the project's `.gitignore` | P1 |
| PP-4 | A project can have a `.agent-toolkit.yaml` manifest that specifies profile + tool overrides, auto-detected when linking | P2 |
| PP-5 | "Unlink" action per project removes all symlinks. Accessible from `/projects` page. | P1 |

### 7.7 MCP Server Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MC-1 | `mcp/servers.yaml` declares MCP servers to install with name, package, transport, env vars | P1 |
| MC-2 | `/mcp` page installs servers via `npm` / `npx` / `uvx` / `pip` with streaming progress output | P1 |
| MC-3 | MCP config files are generated for each tool that supports MCP (Claude Code, Cursor, Windsurf, OpenCode) | P1 |
| MC-4 | Server list includes commonly needed servers: `filesystem`, `github`, `sqlite`, `memory`, `fetch`, `postgres` | P1 |

**Example `mcp/servers.yaml`:**

```yaml
servers:
  - name: github
    package: "@modelcontextprotocol/server-github"
    transport: stdio
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"

  - name: filesystem
    package: "@modelcontextprotocol/server-filesystem"
    transport: stdio
    args: ["${HOME}/projects"]

  - name: sqlite
    package: "@modelcontextprotocol/server-sqlite"
    transport: stdio
    args: ["${HOME}/.agent-toolkit/memory.db"]

  - name: memory
    package: "@modelcontextprotocol/server-memory"
    transport: stdio

  - name: fetch
    package: "@modelcontextprotocol/server-fetch"
    transport: stdio

  - name: postgres
    package: "@modelcontextprotocol/server-postgres"
    transport: stdio
    env:
      POSTGRES_CONNECTION_STRING: "${DATABASE_URL}"
    optional: true
```

### 7.8 Self-Refining Skills

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-1 | Skill detail page has a "Refine" panel that accepts natural language instructions and patches the `SKILL.md` | P2 |
| SR-2 | Self-refinement shows a git diff preview before committing | P2 |
| SR-3 | Commits use conventional format: `skill(<domain>/<name>): <description>` | P2 |
| SR-4 | Self-refinement can be invoked by an agent via MCP tool call (expose as `agent-toolkit` MCP server) | P3 |
| SR-5 | An agent can run: "Update my spark-optimization skill to include the new Iceberg v3 partitioning strategy" and the skill file is patched in-place | P3 |

### 7.9 Agent-Toolkit as MCP Server (Future)

| ID | Requirement | Priority |
|----|-------------|----------|
| MCP-1 | Expose `agent-toolkit` itself as an MCP server that agents can query at runtime | P3 |
| MCP-2 | Tools: `list_skills`, `get_skill`, `search_skills`, `update_skill`, `list_profiles` | P3 |
| MCP-3 | Resources: each skill exposed as a resource URI (`skill://data-engineering/spark-optimization`) | P3 |
| MCP-4 | This enables agents to pull skill knowledge dynamically instead of relying on static file injection | P3 |

---

## 8. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-1 | **Minimal dependencies**: Requires only `node >= 20` and `git`. `npm install` handles everything. |
| NF-2 | **Fast**: Full install wizard completes in < 60 seconds (dominated by MCP npm installs). Sync action completes in < 5 seconds. Dev server starts in < 3 seconds (Next.js Turbopack). |
| NF-3 | **Safe**: Symlinks only — never overwrites files outside this repo. Existing configs are backed up before overwriting. JSON configs are merged safely, never clobbered. |
| NF-4 | **Portable**: Works on macOS (primary), Linux, and inside Docker/devcontainers/Codespaces. |
| NF-5 | **Git-native**: The repo is the database. Skill versioning = git history. No external database or cloud dependency. |
| NF-6 | **Idempotent**: Every action (install, sync, link, uninstall) is safe to trigger repeatedly. |
| NF-7 | **Extensible**: Adding support for a new tool = adding one adapter file in `lib/adapters/`. No changes to skills or profiles needed. |
| NF-8 | **Observable**: `/doctor` page reports full system health in real time. Build logs show exactly what was generated and why. |

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| API keys in env files | `.agent-toolkit.env` is gitignored. `/settings` page manages keys securely and never logs them. Support for 1Password CLI / `op` integration as optional backend. |
| Skills with executable scripts | Scripts in `skills/*/scripts/` are only executed by agents that support it (Claude Code). The webapp never auto-executes them. |
| Symlink hijacking | `linker.ts` verifies symlink targets point inside the repo before creating. `/doctor` page checks for dangling or redirected symlinks. |
| MCP server trust | `mcp/servers.yaml` only references official `@modelcontextprotocol/*` packages by default. User-added servers are flagged in `/doctor` output. |
| JSON config corruption | `safety.ts` reads existing JSON configs (e.g., `mcp.json`, `opencode.json`), deep-merges toolkit entries, and writes back atomically. Never clobbers user-added entries. |
| Local-only access | The webapp runs on `localhost:3000` only. No network-exposed routes. Server Actions use Node.js `fs` — no shell injection vectors. |

---

## 10. Web Interface

A fullstack **Next.js 15** app running locally at `http://localhost:3000`. No separate backend — Server Actions handle all filesystem operations directly.

### 10.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Server Actions, Turbopack) |
| **UI** | React 19 + TailwindCSS 4 + shadcn/ui |
| **Icons** | Lucide React |
| **Validation** | Zod (shared types between client and server) |
| **Markdown** | `react-markdown` + `remark-gfm` + `remark-frontmatter` for skill preview |
| **Diff** | `diff` package + custom diff viewer component |
| **File system** | Node.js `fs/promises` (symlink, read, write — all via Server Actions) |
| **Package manager** | npm (also used for MCP server installs) |
| **Testing** | Vitest + React Testing Library |

### 10.2 Pages

| Route | Purpose |
|-------|---------|
| `/` | **Dashboard** — detected tools (with status badges), total skills, active profile, linked projects, quick "Sync" button, health summary |
| `/install` | **Setup Wizard** — multi-step guided flow: detect tools → pick profile → build → link → MCP → env. Real-time streaming progress per step. |
| `/skills` | **Skill Browser** — filterable grid/list of all skills. Search by name, domain, tag. Cards show name, domain, tags, description snippet, installed-to indicators. |
| `/skills/[domain]/[name]` | **Skill Detail** — full markdown preview, frontmatter editor, per-tool activation toggles, "Install to..." button (opens tool-target picker), diff viewer, "Refine" panel. |
| `/skills/new` | **New Skill** — form: domain (dropdown or new), name (validated), description, template selection. Creates directory + `SKILL.md` scaffold. |
| `/add-skill` | **Add Skill Flow** — the core interactive flow: pick skill → tool-target picker (multi-select checkboxes: tool × scope) → safety check panel → confirm → stream results. |
| `/profiles` | **Profile Manager** — list all profiles with skill counts. Click to edit: toggle skills, adjust per-tool settings, preview generated output. |
| `/profiles/[name]` | **Profile Detail** — included skills visualization, per-tool config overrides, "Build with this profile" button, diff preview vs current dist. |
| `/projects` | **Linked Projects** — table of all linked projects with profile, tool count, last synced. "Unlink" action per row. |
| `/projects/link` | **Link Project** — pick project path (file picker or paste) → auto-detect `.agent-toolkit.yaml` → pick profile → preview all symlinks → confirm. |
| `/doctor` | **Health Dashboard** — real-time diagnostics: symlink status (valid/dangling/missing), detected tools, MCP server status, schema validation results, character limit warnings. Auto-refreshes. |
| `/mcp` | **MCP Manager** — server list from `mcp/servers.yaml`, install/uninstall buttons, status indicators, config file viewer per tool. Streaming install output. |
| `/settings` | **Settings** — API key management (masked input), env var editor, backup browser (view/restore from `~/.agent-toolkit-backup/`), uninstall button with confirmation. |

### 10.3 Key UI Components

| Component | Description |
|-----------|------------|
| `<ToolTargetPicker />` | Multi-select grid of checkboxes: rows = tools (Claude Code, Cursor, Windsurf, OpenCode, Codex, AGENTS.md), columns = scopes (global, project). Disabled checkboxes for tools not detected. |
| `<SafetyCheckPanel />` | Real-time checklist that runs as user selects targets: duplicate detection, JSON merge preview, character limit check, AGENTS.md conflict scan. Green ✓ / yellow ⚠ / red ✗ per check. |
| `<MarkdownPreview />` | Live rendered preview of `SKILL.md` content with syntax-highlighted code blocks and frontmatter table. |
| `<DiffViewer />` | Side-by-side or unified diff view. Used in skill refinement, profile changes, and pre-install preview. |
| `<InstallWizard />` | Multi-step stepper component. Each step has its own Server Action. Progress streams via React `useTransition` + streaming responses. |
| `<TerminalOutput />` | Monospace streaming output panel for build, install, MCP operations. Supports ANSI-like coloring (green ✓, red ✗, yellow ⚠). |
| `<SkillCard />` | Card component: skill name, domain badge, tag pills, description truncated, installed-to tool icons. Click → detail page. |

### 10.4 Safety Module (`lib/safety.ts`)

The safety module ensures the webapp **never breaks existing configurations**.

| ID | Requirement | Priority |
|----|-------------|----------|
| SF-1 | **JSON merge safety**: When writing to JSON config files (e.g., `mcp.json`, `opencode.json`), read existing content, deep-merge toolkit entries under a namespaced key, and write back. Never overwrite user-added entries. | P0 |
| SF-2 | **Duplicate detection**: Before installing a skill, check if an identically-named skill/rule already exists at the target path. If it exists and was not created by the toolkit (no `.agent-toolkit` marker), show a warning in `<SafetyCheckPanel />` and require explicit confirmation. | P0 |
| SF-3 | **Atomic writes**: All file writes go to a `.tmp` file first, then `fs.rename()` to the target. Interrupted writes never leave corrupted files. | P0 |
| SF-4 | **Backup before modify**: Before modifying any file outside the repo (global configs, JSON files), create a timestamped backup in `~/.agent-toolkit-backup/`. Browsable from `/settings`. | P0 |
| SF-5 | **Rollback on failure**: If any step in a multi-step operation fails (e.g., install wizard), automatically undo all changes made in that operation. UI shows rollback progress. | P1 |
| SF-6 | **Preview mode**: All destructive actions show a full preview of what will change before executing. The install wizard, add-skill flow, and link flow all have a "Review changes" step before "Confirm". | P1 |
| SF-7 | **Manifest tracking**: `dist/.manifest.json` tracks every file the toolkit has created or modified, with checksums. Uninstall and unlink actions use this to know exactly what to remove. | P0 |
| SF-8 | **Symlink validation**: Before creating a symlink, verify the target doesn't already exist as a regular file (not a symlink). If it does, back it up first. Verify source exists. | P0 |
| SF-9 | **AGENTS.md merge**: When appending to an existing `AGENTS.md`, parse existing sections and only add/update toolkit-managed sections (delimited by `<!-- agent-toolkit:start -->` / `<!-- agent-toolkit:end -->` markers). Never touch user-written content. | P0 |
| SF-10 | **Character limit enforcement**: Before writing, validate output against tool-specific limits. Show warnings in `<SafetyCheckPanel />` with exact char counts and offer to truncate or split. | P1 |

---

## 11. Value Proposition

### Cross-Pollination
Write a Spark optimization guide once → it becomes a Claude Code skill in `~/.claude/skills/`, a Cursor rule in `.cursor/rules/`, a Windsurf rule in `.windsurf/rules/`, an OpenCode skill in `.opencode/skills/`, a Codex instruction in `~/.codex/AGENTS.md`, and a universal `AGENTS.md` entry — simultaneously.

### Standardization
Whether you're at Atlan debugging a Spark pipeline or building a FastAPI side project at home, every agent you use follows the same patterns, conventions, and quality bar.

### Portability
```bash
# New machine? Codespace? Devcontainer?
git clone git@github.com:manthanmtg/agent-toolkit.git
cd agent-toolkit && npm install && npm run dev
# Open http://localhost:3000 → click "Install" → done.
```

### Evolvability
Mid-session, you discover a better Iceberg compaction strategy. Tell your agent:
> "Update my spark-optimization skill to include snapshot expiry best practices."

The agent patches `SKILL.md`, you review the diff in the webapp, commit, hit "Sync" — and every tool on every machine gets the improvement.

### Team Distribution
Fork this repo, customize skills for your team, add it to your onboarding:
```bash
git clone git@github.com:atlan-eng/agent-toolkit.git
cd agent-toolkit && npm install && npm run dev
# Select "atlan" profile in the install wizard
```
Every new engineer gets the team's collective AI knowledge on day one.

---

## 12. Milestones

| Phase | Scope | Deliverables |
|-------|-------|-------------|
| **v0.1 — Skeleton** | Next.js scaffold, `package.json`, skill schema, 3 starter skills, AGENTS.md adapter | `app/`, `lib/`, `skills/`, `_schema.json` |
| **v0.2 — Core Adapters** | Claude Code + Cursor + Windsurf adapters in TS, `builder.ts`, `/doctor` validation | Full build pipeline for 3 IDE-based tools |
| **v0.3 — Terminal Agents** | OpenCode + Codex adapters, profiles system | All 6 adapters functional (5 tools + AGENTS.md) |
| **v0.4 — Webapp + Safety** | `/install` wizard, `/add-skill` flow, `safety.ts`, `linker.ts`, `detector.ts` | Install wizard works end-to-end with safety checks |
| **v0.5 — Per-Project** | `/projects/link` flow, `.agent-toolkit.yaml` detection, `.gitignore` management | Per-project linking functional |
| **v0.6 — Skill Editor** | `/skills/[domain]/[name]` detail page, markdown preview, frontmatter editor, refine panel, diff viewer | Full skill management in browser |
| **v0.7 — MCP Server** | Expose toolkit as MCP server, runtime skill queries | Agents can query skills dynamically |
| **v0.8 — Extension Adapters** | Community adapters for Copilot, Roo Code, Continue, Aider | Extensibility proven |
| **v1.0 — Stable** | Full tests, README, 5+ real projects linked, battle-tested | Production-ready |

---

## 13. Open Questions

1. **Token/character budgets**: Windsurf caps global rules at 6K chars, workspace rules at 12K. Codex caps combined instructions at 32 KiB. OpenCode caps skill descriptions at 1,024 chars. Should adapters auto-truncate, prioritize by tag, or split into multiple files?
2. **Conflict resolution**: If two skills contradict (e.g., different formatting preferences), should profiles specify precedence order, or should skills declare mutual exclusion?
3. **AGENTS.md vs tool-specific**: OpenCode and Codex are AGENTS.md-native; Cursor and Windsurf also read it. Should `AGENTS.md` be the primary output, with tool-specific configs as optional enhancements?
4. **Secret management backend**: `.env` file vs 1Password CLI (`op`) vs Doppler vs `aws secretsmanager`? Should `/settings` support pluggable secret backends?
5. **Skill marketplace**: Should commonly useful skills (code-review, security-audit, docstring-generator) be published as a separate public repo or registry that others can `git submodule` in?
6. **Windsurf skills vs rules**: Windsurf now supports both `skills/` and `rules/` directories. Should the adapter emit both, or prefer one?
7. **Cursor remote rules**: Cursor supports importing rules from GitHub repos. Should the toolkit publish skills as a Cursor-compatible remote rules repo?
8. **OpenCode Claude compatibility**: OpenCode reads `~/.claude/skills/` by default. Should the Claude Code adapter output be the canonical source that OpenCode also reads, or should OpenCode get its own copy in `~/.config/opencode/skills/`?
9. **Codex override strategy**: Codex supports `AGENTS.override.md` per directory. Should the toolkit generate overrides for project-specific skill customization?

---

## 14. Success Criteria

- [ ] Install wizard on a fresh macOS machine configures all detected AI tools in < 60 seconds
- [ ] Editing a `SKILL.md` and clicking "Sync" propagates the change to all 5 tool formats + AGENTS.md
- [ ] At least 5 real projects (2 work, 3 personal) are linked via `/projects/link`
- [ ] Zero manual copy-paste of prompts/rules between tools for 30 consecutive days
- [ ] `/doctor` page reports all-green on a configured machine
- [ ] A new team member can `git clone` + `npm install` + `npm run dev` and have a fully configured AI environment in under 2 minutes
- [ ] At least one skill has been self-refined via the skill detail "Refine" panel
- [ ] `/add-skill` flow correctly detects duplicates and merges JSON configs without data loss
- [ ] The webapp loads in < 3 seconds and all Server Actions complete in < 5 seconds
