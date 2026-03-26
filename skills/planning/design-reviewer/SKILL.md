---
name: design-reviewer
description: >
  Review and stress-test an implementation plan produced by design-architect
  (or written manually). Evaluate completeness, correctness, risks, ordering,
  and feasibility before any code is written. Use when a plan exists and the
  user wants it reviewed, challenged, or validated.
domain: planning
version: 1.0.0
tags: [planning, review, validation, architecture, design, quality]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Design Reviewer

Challenge the blueprint before building on it.

## Trigger Signals 🎯

Use this skill when:

- A plan or design doc has been produced and the user asks for a review
- The user says "review the plan", "does this plan make sense?", "what am I missing?"
- A design-architect plan was just approved and you want a second-pass sanity check
- The user pastes or references an implementation plan and wants feedback
- Before starting implementation on a complex plan

## Phase 1: Understand the Plan 📖

Read the entire plan carefully. Do NOT skim. Build a mental model of:

- [ ] **Goal**: What is the plan trying to achieve?
- [ ] **Scope**: What files, systems, and interfaces are touched?
- [ ] **Phases**: How is work sequenced? What depends on what?
- [ ] **Decisions**: What key choices were made and why?
- [ ] **Omissions**: What does the plan explicitly say it won't change?

If no written plan exists, ask the user to provide one or run design-architect first.

## Phase 2: Review Checklist ✅

Evaluate the plan against each dimension. For every issue found, classify it:

- 🔴 **Blocker** — must be fixed before implementation starts
- 🟡 **Warning** — should be addressed, but not a showstopper
- 🟢 **Suggestion** — optional improvement

### Completeness

- [ ] Every file to touch is named with add/modify/remove intent
- [ ] No vague steps like "update relevant files" or "refactor as needed"
- [ ] Edge cases and error paths are addressed
- [ ] Migration/rollout strategy exists (if applicable)
- [ ] Test plan is included or accounted for

### Correctness

- [ ] The plan actually solves the stated requirements
- [ ] Data flow is consistent — no broken chains between phases
- [ ] API contracts, schemas, and types are consistent across changes
- [ ] Existing behavior isn't silently broken

### Ordering & Dependencies

- [ ] Phase dependencies are acyclic (no circular deps)
- [ ] Each phase is independently testable or reviewable
- [ ] Foundation work comes before dependent work
- [ ] No phase assumes artifacts from a later phase

### Risk & Safety

- [ ] Shared interfaces, public APIs, and DB schemas are flagged
- [ ] Backward compatibility is addressed (or explicitly broken with a plan)
- [ ] Rollback strategy exists for risky changes
- [ ] No single phase is a "big bang" that changes everything at once

### Codebase Fit

- [ ] Plan follows existing patterns in the repo
- [ ] Naming conventions match the codebase
- [ ] No unnecessary abstractions or over-engineering
- [ ] Removal plan exists for replaced functionality (no dead code left behind)

### Open Questions

- [ ] All open questions are surfaced, not hidden in assumptions
- [ ] Ambiguities have been called out rather than silently decided

## Phase 3: Produce the Review 📋

Structure your review using this template:

```
## Plan Review Summary

**Plan**: [name or one-line summary of the plan]
**Verdict**: 🟢 Ready / 🟡 Needs Revisions / 🔴 Not Ready

## Findings

### 🔴 Blockers
- [Issue]: [explanation + suggested fix]

### 🟡 Warnings
- [Issue]: [explanation + suggested fix]

### 🟢 Suggestions
- [Issue]: [explanation]

## Dependency Graph Check
- Phase ordering: [OK / Issues found]
- Circular dependencies: [None / Describe]

## Risk Assessment
- Highest-risk change: [what and why]
- Blast radius: [how much breaks if this goes wrong]
- Mitigation: [what the plan does (or should do) about it]

## Missing Pieces
- [Anything the plan forgot or assumed away]

## Verdict Details
[1-2 paragraphs explaining the overall assessment and what needs
to happen before implementation should begin]
```

## Phase 4: Iterate 🔄

- Present findings to the user
- If the verdict is 🟡 or 🔴, suggest specific revisions
- Offer to re-review after the plan is updated
- Once the plan passes review, confirm it's ready for implementation

## Review Principles

### Be Constructive, Not Dismissive

Every finding should include a suggested fix or direction. "This is wrong" without a path forward is not a review — it's a complaint.

### Verify Against the Code, Not Just the Plan

Read the actual source files referenced in the plan. Verify that:
- Files mentioned actually exist (or are correctly marked as "Create")
- The described current behavior matches reality
- Interfaces referenced are accurate

### Think in Failure Modes

For each phase, ask: "What happens if this goes wrong?" If the answer is "everything breaks and there's no rollback," flag it.

### Respect the Architect's Intent

The goal is to strengthen the plan, not rewrite it. If the approach is sound but details are missing, say so. Don't redesign from scratch unless the approach is fundamentally flawed.

### Check the Seams

The riskiest parts of any plan are the boundaries: between phases, between systems, between old and new code. Focus review energy there.

## Red Flags 🚨

- Reviewing without reading the actual codebase
- Rubber-stamping a plan without checking file references
- Flagging style preferences as blockers
- Rewriting the plan instead of reviewing it
- Ignoring the removal/cleanup plan
- Approving a plan with unresolved open questions

## Exit Criteria 🏁

A review is complete when:

- Every dimension in the checklist has been evaluated
- All blockers have been identified with suggested fixes
- The verdict is clearly stated with justification
- The user has seen the review and decided next steps
