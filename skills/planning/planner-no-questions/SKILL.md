---
name: planner-no-questions
description: >
  Plan the design for an implementation before code changes without asking the
  user clarifying questions. Use when the user asks to plan, design, architect,
  specify, or prepare an implementation and explicitly wants no questions,
  autonomous planning, or best-effort assumptions. Produces a detailed Markdown
  design document with enough file-level, API-level, testing, rollout, and
  edge-case detail for a weaker implementer model to execute reliably.
domain: planning
version: 1.0.0
tags: [planning, no-questions, design-doc, architecture, implementation-plan, handoff]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Planner No Questions

Create an implementation design document before code is written. Do not ask the
user clarifying questions; make conservative assumptions and record them.

## Core Rules

- Do not make implementation edits while using this skill.
- Do not ask product, technical, or preference questions.
- Read the codebase before planning. Do not plan from assumptions when source,
  tests, configs, or docs can answer the question.
- Use the safest reversible interpretation when requirements are ambiguous.
- Record every material assumption in the design doc.
- Stop only when the task cannot be planned without external secrets, missing
  artifacts, prohibited access, or a safety-critical decision. Report the exact
  blocker instead of asking a question.
- Prefer existing project patterns over new abstractions.
- Make the final plan concrete enough that an implementer can follow it without
  redesigning.

## Workflow

### 1. Establish Scope

- Restate the user goal in one or two sentences.
- Identify whether this is a feature, bugfix, refactor, migration, test-only
  change, documentation change, or operational change.
- Identify likely affected surfaces: UI, API, data model, storage, background
  jobs, config, build, tests, docs, deployment, or observability.
- Convert ambiguity into explicit assumptions. Prefer small, backwards-compatible
  behavior over broad redesign.

### 2. Inspect Current State

- Check repository structure, package scripts, framework versions, and relevant
  conventions.
- Read the files that own the current behavior.
- Read tests for the affected area.
- Search for similar implementations and local helper APIs.
- Note existing invariants, public contracts, schemas, feature flags, and error
  handling patterns.

### 3. Design The Change

- Define the target behavior in precise terms.
- Name every file expected to be added, modified, or deleted.
- Specify function, component, route, schema, type, config, and data-flow changes
  at the level an implementer needs.
- Include validation, error handling, logging, accessibility, security,
  performance, and backward compatibility requirements when applicable.
- Split work into ordered phases with dependencies.
- Include a focused test strategy with exact test files or commands.
- Call out risks, rollback or migration concerns, and non-goals.

### 4. Write The Design Doc

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

## Assumptions
- Assumption made because questions are not allowed.

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
- [ ] Requirement is unambiguous or assumptions are explicit.
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
- Every uncertainty must be converted into a clearly labeled assumption.
- The final response should point to the design doc path and summarize the most
  important assumptions.
