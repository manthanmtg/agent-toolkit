---
name: appsec-review
description: >
  Application security review workflow covering OWASP risks, secrets exposure,
  dependency vulnerabilities, input validation, auth checks, and secure defaults.
  Use when the user asks for a security scan, vuln review, or hardening pass.
domain: security-scan
version: 1.0.0
tags: [security, owasp, vulnerabilities, auth, secrets, hardening]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# AppSec Review

Assume hostile input, curious users, and imperfect infrastructure.

## Trigger Conditions 🔐

- "Do a security review"
- Authentication or authorization changes
- File upload, parsing, or external webhook code
- Dependency or secret exposure concerns
- Pre-release hardening checks

## Security Review Checklist ✅

- [ ] Inputs validated and normalized
- [ ] Authorization enforced at the sensitive boundary
- [ ] Secrets never logged, committed, or rendered back to clients
- [ ] Errors avoid leaking internals
- [ ] Dependencies and images reviewed for known risk
- [ ] Dangerous defaults removed or guarded

## Core Threat Lenses 🛡️

### OWASP-style risks

- Injection
- Broken access control
- Cryptographic misuse
- Insecure design
- Security misconfiguration
- Vulnerable dependencies
- Logging and monitoring gaps

### Code-level risks

- Path traversal and unsafe file reads
- SSRF and untrusted URL fetches
- Deserialization hazards
- Unsafe regex or parser denial of service
- Cross-tenant data exposure

## Review Tactics 🔎

1. Find all trust boundaries: request input, env vars, files, queues, third-party APIs.
2. Trace where privileged actions happen.
3. Check whether validation and authorization occur before those actions.
4. Inspect logs, errors, and telemetry for sensitive leakage.
5. Look for missing rate limits, replay protection, or integrity checks where relevant.

## Example Finding ✍️

```text
High — lib/actions/install.ts:88
The install action accepts a destination path from user input and writes files
without restricting the path to approved roots. This can overwrite arbitrary
locations if validation regresses. Resolve the target from known tool mappings
instead of trusting raw user-provided paths.
```

## Secure Defaults 🧱

- Deny by default for privileged operations
- Validate allowlists, not just blocklists
- Prefer parameterized APIs over string building
- Keep secrets in env/config stores, never source files
- Make audit logs useful without exposing sensitive data

## Red Flags 🚨

- Security review limited to dependency scanning only
- Admin checks in the UI but not on the server
- Temporary debug endpoints left enabled
- User-controlled markdown, HTML, paths, or URLs handled without strict boundaries

## Final Standard 🏁

A strong security pass identifies exploitable paths, explains impact, and closes them with minimal ambiguity.
