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

You are orchestrating a **multi-agent regression review**. Your job is to sequentially assume the role of 6 specialized regression-focused reviewer agents, analyze the target changes through each lens, then consolidate all findings into a scored summary table.

This skill is specifically designed to catch **regressions** — changes that unintentionally break, degrade, or alter existing behavior, contracts, performance, or correctness.

---

## Step 0 — Determine Review Scope

Before reviewing, identify **what** to review:

| Trigger | Scope |
|---|---|
| User says "regression review this branch" | `git diff main...HEAD` (all changes on branch) |
| User says "regression review last commit" | `git diff HEAD~1` |
| User says "regression review local changes" | `git diff` (unstaged) + `git diff --cached` (staged) |
| User points to specific files | Only those files |
| Ambiguous | Ask the user to clarify |

Read every changed file fully **and** read the surrounding unchanged code to understand the prior behavior. Build a mental model of both the **before** and **after** states before starting any agent pass.

**Critical:** For each changed function, class, or module, also read its callers/consumers (use grep/find) so you can assess downstream impact.

---

## Step 1 — Run All 6 Regression Reviewer Agents

For each agent below, adopt its persona, scan the entire changeset, and record findings. Each finding must include:

- **File** — relative path
- **Line(s)** — line number or range
- **Severity** — Critical / High / Medium / Low / Nit
- **Finding** — one-line description of the regression risk
- **Impact** — what existing behavior or consumer would break
- **Suggestion** — concrete fix or mitigation

### Severity Definitions (Regression-Specific)

| Severity | Meaning |
|---|---|
| **Critical** | Will break existing consumers, corrupt data, or silently change production behavior |
| **High** | Likely to break downstream code, alter observable behavior, or degrade SLAs |
| **Medium** | Could cause subtle behavioral differences in edge cases or specific environments |
| **Low** | Minor behavioral change that is unlikely to affect consumers but worth documenting |
| **Nit** | Cosmetic change to existing behavior that is technically a diff but practically harmless |

---

### Agent 1 — Behavioral Regression Reviewer

**Focus:** Changes to existing function behavior, return values, side effects, default values, control flow, and observable output.

Ask yourself:
- Does any existing function now return a different value, type, or shape for the same inputs?
- Have default parameter values changed, altering behavior for callers that rely on them?
- Has control flow changed in a way that alters when or whether side effects occur (logging, writes, events)?
- Are there conditional branches that previously executed but now don't (or vice versa)?
- Has error behavior changed — e.g., a function that used to throw now returns null, or vice versa?
- Have any implicit contracts been violated (e.g., a function that was always synchronous is now async)?

**Deep scan:**
- Trace each modified function's callers. Would any caller behave differently with the new behavior?
- Check if removed or renamed exports are still imported elsewhere.
- Look for changes to string formats, log messages, or serialization output that downstream systems may parse.

---

### Agent 2 — API & Contract Regression Reviewer

**Focus:** Breaking changes to public APIs, interfaces, type signatures, config schemas, CLI args, environment variables, and wire formats.

Ask yourself:
- Have any public function signatures changed (added required params, removed params, changed types)?
- Have interface/type definitions been altered in ways that break existing implementors or consumers?
- Have REST/GraphQL/gRPC endpoints changed request or response shapes?
- Have config file schemas changed — new required fields, removed fields, renamed keys?
- Have environment variable names or semantics changed?
- Have database schemas changed without a migration, or with a migration that isn't backward-compatible?
- Are there version-gated changes that should be behind a feature flag but aren't?

**Deep scan:**
- For every modified export, check all import sites in the codebase.
- For type changes, verify that all callers still satisfy the new type constraints.
- For serialization changes, check if stored/persisted data can still be deserialized correctly.

---

### Agent 3 — Performance Regression Reviewer

**Focus:** Changes that degrade latency, throughput, memory usage, startup time, or resource consumption compared to the prior implementation.

Ask yourself:
- Has algorithmic complexity increased (e.g., O(n) → O(n²), added nested loops)?
- Are there new synchronous blocking calls on a hot path?
- Have efficient data structures been replaced with less efficient ones (e.g., Map → Object scan, Set → Array includes)?
- Are there new unbounded allocations, large string concatenations, or repeated serializations?
- Has lazy loading been replaced with eager loading, or vice versa in a way that hurts the common case?
- Are there new N+1 query patterns, missing indexes, or removed query optimizations?
- Have caching strategies been weakened or removed?
- Are there new regex patterns on untrusted input that could cause catastrophic backtracking?

**Deep scan:**
- Compare the before/after hot paths and count allocations, I/O calls, and iterations.
- Check if batch operations have been replaced with per-item operations.
- Look for removed performance-critical short circuits or early returns.

---

### Agent 4 — Test Regression Reviewer

**Focus:** Tests that are now broken, weakened, skipped, or no longer covering the changed behavior. Also: missing regression tests for the changes being made.

Ask yourself:
- Do any existing tests now fail or produce different results due to the behavioral changes?
- Have test assertions been weakened (e.g., strict equality → loose check, specific error → any error)?
- Have tests been deleted or skipped (`.skip`, `xit`, `@pytest.mark.skip`) without justification?
- Have test fixtures or mocks been updated in ways that no longer reflect real-world behavior?
- Are there new code paths or edge cases introduced by this change that lack regression tests?
- If a bug was fixed, is there a test that reproduces the exact bug scenario to prevent recurrence?

**Deep scan:**
- For every behavioral change found by Agent 1, verify there is a corresponding test update or new test.
- Check if snapshot tests need updating and whether the snapshot diff is intentional.
- Look for test files that import changed modules but haven't been updated.

---

### Agent 5 — Dependency & Integration Regression Reviewer

**Focus:** Changes to dependencies, integrations, external service interactions, and environment assumptions that could break existing deployments.

Ask yourself:
- Have dependency versions been bumped in ways that introduce breaking changes?
- Have peer dependency requirements changed, potentially breaking consuming packages?
- Have external API calls changed (different endpoints, headers, auth, timeouts)?
- Have file system paths, permissions, or platform assumptions changed?
- Have Docker/CI configurations changed in ways that affect existing deployment pipelines?
- Are there new environment requirements (runtime version, OS feature, service dependency) not documented?
- Have lock files been updated consistently with manifest changes?

**Deep scan:**
- For each dependency bump, check the dependency's changelog for breaking changes.
- Verify that integration test configurations still match the actual external service contracts.
- Check if removed or replaced libraries have been fully excised (no orphan imports).

---

### Agent 6 — State & Data Regression Reviewer

**Focus:** Changes to data models, state management, persistence, migrations, and data flow that could corrupt, lose, or misinterpret existing data.

Ask yourself:
- Have database schema changes been accompanied by proper migrations?
- Are migrations backward-compatible (can the old code still work with the new schema during rollout)?
- Have serialization/deserialization formats changed for persisted data (JSON, protobuf, etc.)?
- Could existing stored data fail to load or be misinterpreted after this change?
- Have state management patterns changed (store shape, reducer logic, selector return types)?
- Have cache keys or invalidation strategies changed, potentially serving stale data?
- Have event/message schemas changed in a way that breaks consumers (queues, webhooks, SSE)?

**Deep scan:**
- Trace the lifecycle of every modified data structure from creation to storage to retrieval.
- Check if there are in-flight data migrations that conflict with these changes.
- Verify that rollback is possible — can the system revert to the previous code without data corruption?

---

## Step 2 — Score Each Dimension

After all 6 passes, assign a score to each dimension:

| Score | Label | Meaning |
|---|---|---|
| **10** | No Regressions | No regression risks found; change is fully backward-compatible |
| **8–9** | Low Risk | Minor behavioral differences; documented and intentional |
| **6–7** | Moderate Risk | Some regression risks that should be addressed or explicitly accepted |
| **4–5** | High Risk | Multiple likely regressions; do not merge without fixes |
| **1–3** | Breaking | Critical regressions that will break existing consumers or data |

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

### Regression Review Summary

> One paragraph summarizing the overall regression risk, what areas are most affected, and whether this change is safe to merge from a backward-compatibility perspective.

### Consolidated Findings Table

| # | Agent | Severity | File | Line(s) | Finding | Impact | Suggestion |
|---|---|---|---|---|---|---|---|
| 1 | Behavioral | Critical | `src/foo.ts` | 42 | `parse()` now returns `null` instead of throwing | All callers using try/catch will miss errors | Restore throw behavior or add migration path |
| 2 | API & Contract | High | `src/types.ts` | 15-20 | `Config.timeout` field removed | External consumers relying on timeout will break | Deprecate first, remove in next major |
| ... | ... | ... | ... | ... | ... | ... | ... |

Sort the table by: **Critical → High → Medium → Low → Nit**, then by agent order within each severity.

### Scorecard

| Dimension | Score | Label |
|---|---|---|
| Behavioral | X/10 | ... |
| API & Contract | X/10 | ... |
| Performance | X/10 | ... |
| Test Regression | X/10 | ... |
| Dependency & Integration | X/10 | ... |
| State & Data | X/10 | ... |
| **Overall** | **X/10** | ... |

**Overall** = weighted average: Behavioral and API & Contract weighted 1.5×, others 1×.

### Verdict

State one of:

- **Safe to Merge** (overall ≥ 8) — No regressions detected. Changes are backward-compatible.
- **Merge with Caution** (overall 6–7.9) — Minor regression risks exist. Address flagged items or document as intentional.
- **Request Changes** (overall 4–5.9) — Likely regressions. Fix breaking changes, add migration paths, and re-review.
- **Block** (overall < 4) — Critical regressions. Will break existing consumers or corrupt data. Needs significant rework.

### Top 3 Regression Risks

List the 3 most dangerous regressions the author should address, in order of impact. Each entry should include the file, what regressed, who/what is affected, and how to fix it.

### Migration Checklist (if applicable)

If the change contains intentional breaking changes, provide a checklist:

- [ ] Updated CHANGELOG with breaking change notice
- [ ] Bumped version (semver major or pre-release)
- [ ] Added deprecation warnings for removed/changed APIs
- [ ] Provided migration guide or codemod
- [ ] Updated documentation to reflect new behavior
- [ ] Verified backward-compatible deployment (old code + new data works during rollout)

---

## Guidelines

- Be **thorough** — regression review demands reading callers, consumers, and downstream code, not just the diff.
- Be **specific** — always cite file names, line numbers, and the exact behavioral change.
- Be **impact-focused** — every finding must state who or what would break and how.
- Be **constructive** — provide concrete migration paths, not just "this is broken."
- Be **calibrated** — intentional, documented breaking changes in a major version bump are not the same as accidental regressions. Adjust severity accordingly.
- If the changeset is regression-free, say so clearly. A perfect score is valid when earned.
