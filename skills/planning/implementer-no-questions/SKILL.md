---
name: implementer-no-questions
description: >
  Implement code properly from an existing plan, design document, issue spec, or
  implementation checklist without asking the user clarifying questions. Use
  when the user asks to execute a plan, implement planned work, continue from a
  design doc, or build according to documented requirements and explicitly wants
  no questions, autonomous execution, or best-effort implementation.
domain: planning
version: 1.0.0
tags: [implementation, no-questions, execution, plan, engineering, verification]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Implementer No Questions

Execute an approved plan with disciplined engineering practices. Do not ask the
user clarifying questions; make conservative assumptions and record them.

## Core Rules

- Read the full plan or design doc before making code changes.
- Do not ask product, technical, or preference questions.
- Read the existing implementation and tests for every planned touchpoint.
- Use the safest reversible interpretation when the plan is incomplete or
  ambiguous.
- Stop only when implementation would require external secrets, missing
  artifacts, prohibited access, destructive action, or a safety-critical decision.
  Report the exact blocker instead of asking a question.
- Follow repository conventions for architecture, naming, validation, tests,
  formatting, and error handling.
- Keep changes scoped to the planned behavior. Avoid unrelated refactors.
- Protect user work in the repository. Do not revert unrelated changes.
- Verify before claiming completion.

## Workflow

### 1. Intake The Plan

- Locate and read the plan, design doc, issue, or checklist.
- Extract the required behavior, non-goals, files to touch, implementation
  phases, test plan, risks, and assumptions.
- Check whether the plan is current against the repository. If the code has
  drifted, adapt conservatively and record the drift in the final response.
- Convert missing details into explicit assumptions when doing so is safe and
  reversible.

### 2. Prepare The Work

- Inspect `git status` before editing.
- Identify unrelated local changes and leave them alone.
- Read nearby patterns and helper APIs before adding new code.
- Prefer the smallest cohesive set of changes that satisfies the plan.
- If the plan can be split into independent commits or phases, implement one
  phase at a time and verify each phase when practical.

### 3. Implement

- Add or update tests near the behavior being changed.
- Make implementation edits in the files named by the plan. If an additional
  file is required, keep it justified and mention it in the final summary.
- Preserve public API, schema, and compatibility expectations unless the plan
  explicitly changes them.
- Add observability, validation, and error handling where the plan calls for it
  or where the repository pattern requires it.
- Remove obsolete code named by the plan. Do not leave parallel dead paths.

### 4. Verify

- Run the exact commands named in the plan when available.
- Run the repository's relevant tests, type checks, lint checks, build checks, or
  targeted commands needed for confidence.
- If a verification command fails, diagnose the failure and fix it when it is in
  scope.
- If a failure is unrelated or blocked by the environment, report the command,
  failure, and why it remains unresolved.

### 5. Final Response

Report:

- What changed, with file references.
- Verification commands run and their result.
- Assumptions made because questions were not allowed.
- Any deviations from the plan and why.
- Any remaining risks, blocked checks, or follow-up work.

## Implementation Quality Bar

- The implementation matches the plan's requirements and non-goals.
- Tests cover the changed behavior and meaningful edge cases.
- Error handling is explicit at recoverability boundaries.
- Types, schemas, and data flow are consistent end to end.
- UI changes, when present, are accessible and responsive.
- The repository builds or the remaining blockers are clearly documented.
