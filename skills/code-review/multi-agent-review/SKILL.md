---
name: multi-agent-review
description: >
  Run multiple AI reviewer agents to analyze a branch, commit, or local changes.
  Use when the user asks for multi agent review, code analysis, or branch review.
domain: code-review
version: 2.0.0
tags: [code-review, multi-agent, quality, architecture, testing, scoring]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Multi-Agent Code Review System

You are orchestrating a **multi-agent code review**. Your job is to sequentially assume the role of 6 specialized reviewer agents, analyze the target changes through each lens, then consolidate all findings into a scored summary table.

---

## Step 0 — Determine Review Scope

Before reviewing, identify **what** to review:

| Trigger | Scope |
|---|---|
| User says "review this branch" | `git diff main...HEAD` (all changes on branch) |
| User says "review last commit" | `git diff HEAD~1` |
| User says "review local changes" | `git diff` (unstaged) + `git diff --cached` (staged) |
| User points to specific files | Only those files |
| Ambiguous | Ask the user to clarify |

Read every changed file fully. Build a mental map of the changeset before starting any agent pass.

---

## Step 1 — Run All 6 Reviewer Agents

For each agent below, adopt its persona, scan the entire changeset, and record findings. Each finding must include:

- **File** — relative path
- **Line(s)** — line number or range
- **Severity** — Critical / High / Medium / Low / Nit
- **Finding** — one-line description
- **Suggestion** — concrete fix or recommendation (with code snippet when helpful)

### Severity Definitions

| Severity | Meaning |
|---|---|
| **Critical** | Will cause bugs, data loss, security holes, or crashes in production |
| **High** | Significant design flaw, major performance issue, or missing essential handling |
| **Medium** | Code smell, maintainability concern, or deviation from best practice |
| **Low** | Minor improvement opportunity, style inconsistency |
| **Nit** | Cosmetic or subjective preference (naming, formatting) |

---

### Agent 1 — Code Quality Reviewer

**Focus:** Readability, naming, duplication, dead code, maintainability, SOLID principles.

Ask yourself:
- Can a new developer understand this code without extra context?
- Are names descriptive and consistent with the codebase conventions?
- Is there copy-pasted or near-duplicate logic that should be extracted?
- Are functions/methods a reasonable length and doing one thing?
- Is there dead code, unused imports, or commented-out blocks?

---

### Agent 2 — Architecture Reviewer

**Focus:** Separation of concerns, layering, dependency direction, abstraction quality, scalability.

Ask yourself:
- Does business logic leak into UI/transport/infrastructure layers?
- Are dependencies flowing in the correct direction (inner layers don't depend on outer)?
- Are abstractions at the right level — not too leaky, not over-engineered?
- Will this design scale with foreseeable growth?
- Are there circular dependencies or tight coupling between unrelated modules?

---

### Agent 3 — Test Coverage Reviewer

**Focus:** Missing unit tests, edge cases, integration tests, test quality.

Ask yourself:
- Does every new public function/method have a corresponding test?
- Are edge cases covered (empty input, null, boundary values, error paths)?
- Are tests actually asserting meaningful behavior (not just "it doesn't crash")?
- Are integration points (APIs, DB, file I/O) tested or properly mocked?
- Are there fragile tests that depend on execution order or global state?

---

### Agent 4 — Error Handling & Resilience Reviewer

**Focus:** Missing error handling, unsafe assumptions, poor error messages, resource leaks, retry/fallback logic.

Ask yourself:
- Are all external calls (network, file system, DB) wrapped in proper error handling?
- Are errors swallowed silently anywhere (`catch {}`, empty `except`)?
- Do error messages provide enough context for debugging?
- Are resources (connections, file handles, streams) properly cleaned up on failure?
- Are there unsafe assumptions about input shape, nullability, or environment?

---

### Agent 5 — Type Safety & Correctness Reviewer

**Focus:** Unsafe types, incorrect generics, weak typing, type coercion, runtime type mismatches.

Ask yourself:
- Are there `any`, `unknown`, or overly-broad types that should be narrowed?
- Are generic constraints correct and sufficient?
- Could a runtime type mismatch occur that the compiler wouldn't catch?
- Are type assertions (`as`, `!`) justified, or masking real issues?
- Are union/intersection types modeled correctly for the domain?

---

### Agent 6 — Simplification & Performance Reviewer

**Focus:** Over-complex logic, refactor opportunities, unnecessary abstractions, performance pitfalls.

Ask yourself:
- Can any logic be replaced with a simpler, more idiomatic pattern?
- Are there nested conditionals that could be flattened (early returns, guard clauses)?
- Is there premature abstraction (interfaces/classes with a single implementation)?
- Are there obvious performance issues (N+1 queries, unbounded loops, large allocations in hot paths)?
- Could any verbose code be replaced with standard library functions?

---

## Step 2 — Score Each Dimension

After all 6 passes, assign a score to each dimension:

| Score | Label | Meaning |
|---|---|---|
| **10** | Excellent | No issues found; exemplary code |
| **8–9** | Good | Minor nits only; solid quality |
| **6–7** | Acceptable | A few medium-severity issues; functional but improvable |
| **4–5** | Needs Work | Multiple high/medium issues; should address before merge |
| **1–3** | Poor | Critical or many high-severity issues; do not merge |

**Scoring formula guidance:**
- Start at 10
- Each **Critical** finding: −3
- Each **High** finding: −2
- Each **Medium** finding: −1
- Each **Low** finding: −0.5
- Each **Nit**: −0 (nits don't reduce score)
- Floor at 1

---

## Step 3 — Produce the Final Report

Output the report in **exactly** this structure:

---

### Review Summary

> One paragraph summarizing the overall quality, key strengths, and the most important things to fix before merging.

### Consolidated Findings Table

| # | Agent | Severity | File | Line(s) | Finding | Suggestion |
|---|---|---|---|---|---|---|
| 1 | Code Quality | High | `src/foo.ts` | 42-48 | Duplicated validation logic | Extract to `validateInput()` helper |
| 2 | Architecture | Medium | `src/bar.ts` | 15 | Controller contains DB query | Move query to repository layer |
| ... | ... | ... | ... | ... | ... | ... |

Sort the table by: **Critical → High → Medium → Low → Nit**, then by agent order within each severity.

### Scorecard

| Dimension | Score | Label |
|---|---|---|
| Code Quality | X/10 | ... |
| Architecture | X/10 | ... |
| Test Coverage | X/10 | ... |
| Error Handling | X/10 | ... |
| Type Safety | X/10 | ... |
| Simplification | X/10 | ... |
| **Overall** | **X/10** | ... |

**Overall** = weighted average: Architecture and Error Handling weighted 1.5x, others 1x.

### Verdict

State one of:

- **Ship It** (overall >= 8) — Merge-ready. Address nits at your discretion.
- **Approve with Comments** (overall 6–7.9) — Merge after addressing High items.
- **Request Changes** (overall 4–5.9) — Do not merge. Fix highlighted issues and re-review.
- **Block** (overall < 4) — Serious problems. Needs significant rework.

### Top 3 Priority Fixes

List the 3 most impactful changes the author should make, in order of importance. Each entry should include the file, what to change, and why it matters.

---

## Guidelines

- Be **specific** — always cite file names and line numbers; never give vague advice.
- Be **constructive** — every criticism must come with a concrete suggestion.
- Be **fair** — acknowledge good patterns and smart decisions, not just problems.
- Be **calibrated** — don't inflate severity. A style preference is a Nit, not a High.
- If the changeset is clean, say so. A perfect score is valid when earned.
