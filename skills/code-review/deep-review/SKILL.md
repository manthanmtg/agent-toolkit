---
name: deep-review
description: >
  Deep code review workflow focused on bugs, security, performance, resilience,
  maintainability, and missing tests. Use when the user asks for a serious review
  of a diff, branch, PR, or local changes.
domain: code-review
version: 1.0.0
tags: [code-review, bugs, security, performance, testing, maintainability]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Deep Code Review

Review like the change is landing in production today.

## Review Triggers 🔎

Use this skill for:

- PR reviews and branch reviews
- "Find bugs" or "look for regressions"
- Security or performance review requests
- Validation of architecture, tests, or edge cases

## Review Order 🧠

1. Understand scope: branch, commit, files, or working tree.
2. Read the full diff before judging isolated lines.
3. Build a model of expected behavior and failure modes.
4. Review by lens: correctness, security, performance, observability, tests, maintainability.
5. Report findings with severity, file, line, impact, and concrete fix direction.

## Severity Calibration 🎯

- `Critical`: exploitable vuln, data loss, crashes, broken deploys
- `High`: likely production bug, missing auth, severe perf issue, unsafe migration
- `Medium`: maintainability gap, edge-case miss, brittle test, weak validation
- `Low`: clarity, style, or small robustness improvement

## Findings Checklist ✅

- [ ] Can the change fail under invalid input?
- [ ] Does it introduce authn/authz or secret-handling risk?
- [ ] Are network, filesystem, and DB errors surfaced correctly?
- [ ] Are there concurrency, caching, or stale-state pitfalls?
- [ ] Is the happy path tested and are edge paths covered?
- [ ] Does logging make future debugging easier instead of noisier?

## What Strong Findings Look Like ✍️

Each finding should include:

- File and line reference
- Why the behavior is risky
- What user or system impact follows
- A concrete remediation path

### Example

```text
High — app/api/build/route.ts:44
The handler trusts a profile name from the request body and uses it to read files
without validating against the registry. A crafted request can probe unexpected
paths if downstream normalization changes. Validate against known profile IDs
before file access and reject unknown values early.
```

## Review Lenses 🪞

### Correctness

- Off-by-one logic
- Null/undefined assumptions
- Broken state transitions
- Migrations that are not backward compatible

### Security

- Injection paths
- Missing authorization checks
- Secret leakage in logs, errors, or commits
- Unsafe deserialization or file access

### Performance

- N+1 queries and repeated expensive work
- Large payloads, unbounded loops, sync I/O in hot paths
- Wasteful rendering or over-fetching

### Testing

- Missing assertions on behavior that changed
- Mock-heavy tests that do not prove real outcomes
- No regression test for the reported bug

### Maintainability

- Mixed concerns and large functions
- Repeated logic that should be centralized
- Ambiguous naming or surprising side effects

## Reviewer Output Format 📋

Prefer:

- Short executive summary
- Ordered findings by severity
- Open questions or assumptions
- Residual risk if no major issues are found

## Red Flags 🚨

- "Looks good" without reading affected files
- Nitpicks dominating over correctness or security
- Vague comments like "clean this up"
- Missing line references or no suggested fix

## Review Standard 🏁

A high-quality review helps the author ship safer code faster, not just defend opinions.
