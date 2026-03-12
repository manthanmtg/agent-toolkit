---
name: pipeline-hardening
description: >
  CI/CD workflow for reliable pipelines, safe deploys, caching, release checks,
  rollback thinking, and environment parity. Use when the task involves build
  pipelines, release automation, deployment safety, or flaky CI.
domain: ci-cd
version: 1.0.0
tags: [ci-cd, pipelines, deployment, release, automation, rollback]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# CI/CD Pipeline Hardening

Pipelines should be fast enough to trust and strict enough to protect production.

## Trigger Patterns 🚀

- New CI workflow or deploy job
- Flaky or slow pipelines
- Release checklist automation
- Safer rollout, canary, or rollback design

## Pipeline Design Goals 🎯

- Deterministic builds
- Fast feedback on pull requests
- Clear promotion path from test to production
- Reproducible deploy artifacts
- Safe rollback or feature-flag mitigation

## CI Checklist ✅

- [ ] Lock dependency install strategy (`npm ci`, pinned actions, pinned images)
- [ ] Fail fast on lint, typecheck, tests, and build
- [ ] Cache dependencies and build artifacts with stable keys
- [ ] Separate PR validation from deploy permissions
- [ ] Protect secrets and minimize token scope
- [ ] Surface logs and artifacts needed for debugging

## CD Checklist ✅

- [ ] Deployment is idempotent
- [ ] Health checks gate rollout success
- [ ] Rollback path is explicit
- [ ] Schema changes are backward compatible or phased
- [ ] Manual approval exists where blast radius is high

## Example Release Flow 🛠️

1. PR runs lint, typecheck, unit tests, build.
2. Merge to `main` creates a versioned artifact.
3. Staging deploy runs smoke tests against the artifact.
4. Production deploy uses the same artifact, gated by health checks.
5. Rollback re-points to the last known good artifact.

## Flaky CI Triage 🔍

If CI is inconsistent:

- Compare local vs CI runtime versions
- Look for shared mutable state in tests
- Check network-coupled tests and time-sensitive assertions
- Separate infra failures from code failures

## Red Flags 🚨

- Deploying directly from an unpinned branch state
- Using `latest` for actions or base images
- Running destructive migrations before app compatibility is verified
- Pipelines that succeed without proving the built artifact actually works

## Final Standard 🏁

A robust pipeline gives developers fast signal and operators a controlled blast radius.
