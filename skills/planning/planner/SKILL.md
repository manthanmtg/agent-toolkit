---
name: planner
description: >
  Plan the design for an implementation before code changes. Use when the user
  asks to plan, design, architect, specify, or prepare an implementation and
  questions are allowed. Produces a detailed Markdown design document with
  enough file-level, API-level, testing, rollout, and edge-case detail for a
  weaker implementer model to execute reliably.
domain: planning
version: 1.0.0
tags: [planning, design-doc, architecture, implementation-plan, handoff]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Planner

Create an implementation design document before code is written. Optimize the
output for handoff to an implementer that may not infer missing details well.

## Core Rules

- Do not make implementation edits while using this skill.
- Read the codebase before planning. Do not plan from assumptions when source,
  tests, configs, or docs can answer the question.
- Ask concise clarifying questions when requirements, constraints, or acceptance
  criteria are ambiguous.
- Prefer existing project patterns over new abstractions.
- Resolve tradeoffs explicitly. State the selected approach and why alternatives
  were not chosen.
- Make the final plan concrete enough that an implementer can follow it without
  redesigning.

## Workflow

### 1. Establish Scope

- Restate the user goal in one or two sentences.
- Identify whether this is a feature, bugfix, refactor, migration, test-only
  change, documentation change, or operational change.
- Identify likely affected surfaces: UI, API, data model, storage, background
  jobs, config, build, tests, docs, deployment, or observability.
- Ask the user for missing product or behavioral requirements before continuing
  when reasonable assumptions could change the design.

### 2. Inspect Current State

- Check repository structure, package scripts, framework versions, and relevant
  conventions.
- Read the files that own the current behavior.
- Read tests for the affected area.
- Search for similar implementations and local helper APIs.
- Note existing invariants, public contracts, schemas, feature flags, and error
  handling patterns.

### 3. Design the Change

- Define the target behavior in precise terms.
- Name every file expected to be added, modified, or deleted.
- Specify function, component, route, schema, type, config, and data-flow changes
  at the level an implementer needs.
- Include validation, error handling, logging, accessibility, security,
  performance, and backward compatibility requirements when applicable.
- Split work into ordered phases with dependencies.
- Include a focused test strategy with exact test files or commands.
- Call out risks, rollback or migration concerns, and non-goals.

### 4. Write the Design Doc

Create or update a Markdown design doc. If the repository has an established
spec or docs location, use it. Otherwise create:

`docs/designs/YYYY-MM-DD-<short-topic>.md`

Use this structure:

```markdown
# <Implementation Title>

## Goal
What the change must accomplish and why.

## Current State
What exists today, with file references and important behavior.

## Requirements
- Functional requirement
- Non-functional requirement
- Compatibility or migration requirement

## Questions And Answers
- Question: <question asked or ambiguity found>
  Answer: <user answer or explicit assumption>

## Proposed Design
Describe the selected approach, data flow, and control flow.

## Files To Change
| File | Action | Detailed Change |
| ---- | ------ | --------------- |
| path/to/file.ts | Modify | Exact responsibility and expected edits |

## Implementation Phases
### Phase 1: <name>
- Step-by-step edits with file names and expected behavior.

### Phase 2: <name>
- Step-by-step edits with file names and expected behavior.

## Testing Plan
| Test | File or Command | Purpose |
| ---- | --------------- | ------- |
| Unit | path/to/test.ts | Behavior verified |

## Edge Cases
- Edge case and expected handling.

## Risks And Mitigations
- Risk and mitigation.

## Rollout And Rollback
Deployment, migration, feature flag, or rollback notes. Use "Not applicable"
only when truly not needed.

## Non-Goals
- What this plan intentionally leaves unchanged.

## Implementer Handoff Checklist
- [ ] Requirement is unambiguous.
- [ ] Files to change are named.
- [ ] Phases are ordered.
- [ ] Tests and commands are listed.
- [ ] Risks and rollback notes are covered.
```

## Quality Bar

- No vague instructions such as "update relevant files" or "refactor as needed".
- No hidden dependencies between phases.
- No open-ended placeholders such as TODO, TBD, or "decide later" in the final
  design doc.
- Every assumption must be either confirmed by the user or explicitly labeled as
  an assumption.
- The final response should point to the design doc path and summarize open
  questions, if any.
