---
name: change-architect
description: >
  Architect code changes by analyzing existing branches, schemas, protos, and
  new requirements to produce a phased implementation plan before writing code.
  Use when the user describes a feature, refactor, rewrite, or migration and
  wants a structured plan first — or says "don't write code yet."
domain: planning
version: 1.0.0
tags: [planning, architecture, implementation, design, feature, refactor]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Change Architect

Design the surgery before making the incision.

## Trigger Signals 🎯

Use this skill when the user:

- Describes a new feature or requirement change and asks for a plan
- Says "don't write code yet", "plan first", or "write a detailed plan"
- Provides existing branch/PR context alongside new requirements
- Needs to understand the delta between current state and desired state
- Wants to refactor, rewrite, or migrate existing functionality

## Phase 1: Gather Context 🔍

Before planning, build a complete picture. Read code — never plan from assumptions.

### Current State

- [ ] Identify existing branch, PR, or code that relates to the change
- [ ] Read relevant source files, schemas, protos, configs
- [ ] Understand the current behavior and data flow
- [ ] Note existing tests covering the area

### New Requirements

- [ ] Extract what's being added, changed, or removed
- [ ] Identify new schemas, protos, API contracts, or data models
- [ ] Clarify ambiguities — ask the user if requirements are unclear
- [ ] Note constraints: backward compatibility, performance, rollout strategy

### Delta Analysis

- [ ] What existing code becomes obsolete? → **remove**
- [ ] What existing code needs modification? → **modify**
- [ ] What is entirely new? → **add**
- [ ] What stays untouched but is affected? → **verify**

## Phase 2: Produce the Plan 📐

Structure every plan using this template:

```
## Overview
One paragraph: what changes and why.

## Key Decisions
- Decision 1: [choice] because [reason]
- Decision 2: [choice] because [reason]

## Files to Touch

| File | Action | What Changes |
|------|--------|--------------|
| path/to/file.ts | Modify | Description of change |
| path/to/old.ts | Remove | Why it's no longer needed |
| path/to/new.ts | Create | What it contains |

## Implementation Phases

### Phase 1: [Foundation / Setup]
- Concrete step-by-step changes
- Files affected
- Dependencies: none

### Phase 2: [Core Logic]
- Concrete step-by-step changes
- Files affected
- Dependencies: Phase 1

### Phase 3: [Cleanup & Tests]
- Remove deprecated code
- Update or add tests
- Dependencies: Phase 2

## Edge Cases & Gotchas
- Edge case 1: how the plan handles it
- Edge case 2: how the plan handles it

## What's NOT Changing
Explicitly list what remains untouched to set expectations.

## Migration / Rollout Notes
(if applicable) How to deploy safely, feature flags, backward compat.

## Open Questions
- Unresolved decisions needing user input before implementation starts
```

## Phase 3: Review & Iterate 🔄

- Present the plan to the user
- Do **NOT** start implementation until the user approves
- Incorporate feedback and revise
- Once approved, follow the phases in order

## Planning Principles

### Be Specific, Not Vague

- ❌ "Update the handler to support the new flow"
- ✅ "Add `timeRange` parameter to `executeQuery()` in `query-handler.ts`, thread it to the filter builder, apply it when the table schema has a `timestamp_field`"

### Show the Removal Plan

When replacing functionality, explicitly name what gets deleted. Dead code is tech debt. Undeleted code is a lie about what the system does.

### Separate Concerns into Phases

Each phase should be independently testable or reviewable. Avoid "big bang" plans where everything changes at once.

### Flag Risk Early

Shared interfaces, database schemas, public APIs, proto changes — call these out. They need extra care and may need coordination.

### Respect Existing Patterns

Study how the codebase already solves similar problems. The plan should feel native to the repo, not alien.

### Name Every File

A plan that says "update relevant files" is not a plan. Every file to touch must be named, with the action (add/modify/remove) and a description of the change.

## Red Flags 🚨

- Planning without reading the actual code first
- Skipping the removal plan for replaced functionality
- Phases with circular dependencies
- Vague steps like "refactor as needed" or "clean up"
- Ignoring backward compatibility without explicit callout
- Starting to write code before the user approves the plan

## Exit Criteria 🏁

A plan is ready when:

- Every file to touch is named with add/modify/remove intent
- Phases are ordered with no circular dependencies
- Edge cases and gotchas are addressed
- Open questions are surfaced (not hidden)
- The user has reviewed and approved
