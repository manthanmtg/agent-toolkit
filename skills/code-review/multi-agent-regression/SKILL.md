---
name: multi-agent-regression
description: >
  Run multiple AI reviewer agents to analyze a branch, commit, or local changes for regressions.
  Use when the user asks for regression review, regression analysis, or wants to check if changes break existing behavior.
domain: code-review
version: 1.0.0
tags: [code-review, multi-agent, regression, backward-compatibility, breaking-changes]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Multi-Agent Regression Review System

Assume the roles of 6 specialized reviewer agents to analyze changes for regressions. Consolidate findings into a scored summary.

## Step 0 — Determine Scope

- **Branch review**: `git diff main...HEAD`
- **Last commit**: `git diff HEAD~1`
- **Local changes**: `git diff` + `git diff --cached`

Read changed files and surrounding code. Trace callers/consumers for each modification.

## Step 1 — Run 6 Regression Agents

Record findings: **File**, **Line**, **Severity** (Critical/High/Medium/Low/Nit), **Finding**, **Impact**, **Suggestion**.

### Agent 1 — Behavioral Regression
**Focus:** Changes to function behavior, return values, side effects, and control flow.
- Does any function return different values/types for same inputs?
- Have default parameter values changed?
- Has error behavior changed (e.g., throwing vs. returning null)?
- Are implicit contracts violated (e.g., sync to async)?

### Agent 2 — API & Contract
**Focus:** Breaking changes to public signatures, types, config schemas, and wire formats.
- Are parameters added/removed/renamed in public exports?
- Do new type constraints break existing callers?
- Have REST/GraphQL schemas or DB schemas changed without migration?

### Agent 3 — Performance
**Focus:** Latency, memory, and resource usage regressions.
- Increased complexity (e.g., O(n) → O(n²))?
- New blocking calls on hot paths?
- Inefficient data structures (e.g., Map → Object scan)?
- N+1 query patterns or missing indexes?

### Agent 4 — Test Regression
**Focus:** Broken, weakened, or missing tests.
- Do existing tests still pass and accurately reflect behavior?
- Have assertions been weakened?
- Are new edge cases covered by regression tests?
- Is there a bug-repro test for any fixed issue?

### Agent 5 — Dependency & Integration
**Focus:** Third-party changes and environment assumptions.
- Do dependency bumps include breaking changes?
- Changed external API endpoints or headers?
- New runtime requirements or altered deployment configs?

### Agent 6 — State & Data
**Focus:** Persistence, migrations, and data flow.
- Are DB migrations backward-compatible for rollout?
- Can existing stored data still be deserialized?
- Changed state shapes or cache invalidation strategies?

## Step 2 — Scoring

| Score | Label | Meaning |
|---|---|---|
| **10** | No Regressions | Fully backward-compatible |
| **8–9** | Low Risk | Minor intentional differences |
| **6–7** | Moderate | Risks to address or accept |
| **4–5** | High Risk | Multiple regressions; do not merge |
| **1–3** | Breaking | Critical failures |

**Formula:** Start at 10. Deduct: Critical (-3), High (-2), Medium (-1), Low (-0.5). Floor at 1.

## Step 3 — Final Report

### Regression Review Summary
Summary of overall risk and merge safety.

### Findings Table
| # | Agent | Severity | File | Line | Finding | Impact | Suggestion |
|---|---|---|---|---|---|---|---|

Sort: **Critical → High → Medium → Low → Nit**.

### Scorecard
| Dimension | Score |
|---|---|
| Behavioral | X/10 (1.5x weight) |
| API/Contract | X/10 (1.5x weight) |
| Performance | X/10 |
| Test | X/10 |
| Dependency | X/10 |
| State/Data | X/10 |
| **Overall** | **X/10** |

### Verdict
- **Safe to Merge** (≥ 8)
- **Merge with Caution** (6–7.9)
- **Request Changes** (4–5.9)
- **Block** (< 4)

### Migration Checklist
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Deprecation warnings added
- [ ] Docs updated
- [ ] Rollback verified
