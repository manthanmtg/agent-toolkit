---
name: root-cause-debugging
description: >
  Root-cause debugging workflow for analyzing logs, traces, stack traces, state
  transitions, and failing repro steps. Use when the user needs help diagnosing
  a bug, flaky behavior, production incident, or mysterious failure.
domain: debugging
version: 1.0.0
tags: [debugging, logs, stack-traces, incidents, reproduction, root-cause]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Root-Cause Debugging

Debug from evidence, not intuition.

## Trigger Signals 🧯

Use this skill when the user says:

- "Why is this failing?"
- "Help me trace this error"
- "This is flaky / intermittent"
- "Production is broken but logs are noisy"

## Core Loop 🔁

1. Reproduce the issue or confirm why it cannot currently be reproduced.
2. Narrow the failing boundary: input, service, module, or commit window.
3. Collect artifacts: logs, traces, stack traces, metrics, request payloads, screenshots.
4. Form one hypothesis at a time.
5. Prove or kill each hypothesis with a minimal experiment.
6. Identify the root cause, fix it, and add a regression check.

## Debugging Checklist ✅

- [ ] Exact symptom captured
- [ ] Expected behavior written down
- [ ] Reliable repro steps or known non-determinism documented
- [ ] First bad commit / deploy / config change considered
- [ ] Added temporary instrumentation only where signal is missing
- [ ] Verified the fix under the original failing condition

## Evidence Sources 🔍

### Logs

- Search for the first error, not just the loudest one
- Correlate by request ID, job ID, tenant ID, or timestamp
- Compare a failing trace with a successful one

### Stack traces

- Start at the first application frame, not the last framework frame
- Identify the first unexpected input or state mutation
- Track what should have guaranteed that precondition

### State and data

- Inspect serialized inputs, config, env vars, and feature flags
- Watch for race conditions, stale caches, timezone assumptions, and partial writes

## Fast Triage Heuristics ⚡

- If it is intermittent, suspect timing, shared state, retries, or external dependencies.
- If it appeared after a deploy, compare code, config, schema, and secrets changes.
- If tests pass but prod fails, compare data shape and environment assumptions.
- If the stack trace is misleading, instrument entry/exit points around the suspect boundary.

## Example Investigation Flow 🧪

```text
Symptom: User checkout fails with 500
Repro: Only on accounts with expired promo codes
Evidence: Stack trace points to price recalculation
Hypothesis: Null promo metadata reaches discount formatter
Experiment: Log promo payload before formatter
Result: promo.rules is undefined for expired legacy records
Fix: Normalize missing promo rules and add regression test
```

## Good Temporary Instrumentation 🛠️

- Add correlation IDs to logs
- Log shape and key decision points, not entire sensitive payloads
- Guard debug logs behind a flag in noisy paths
- Remove or downgrade temporary instrumentation after resolution

## Red Flags 🚨

- Editing code before confirming the failing mechanism
- Adding broad try/catch blocks that hide the original error
- Printing secrets, tokens, or customer data while debugging
- Declaring victory without reproducing the original issue

## Exit Criteria 🏁

A debugging session is done only when:

- Root cause is named precisely
- Fix is verified
- Regression coverage or monitoring is improved
