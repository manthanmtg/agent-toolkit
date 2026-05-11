---
name: error-handling
description: >
  Use when designing, reviewing, or hardening Python code that fails in
  production-like paths. The skill emphasizes explicit exception taxonomies,
  recoverability boundaries, and observability for resilient behavior across
  tools.
domain: python
version: 1.1.0
tags: [python, errors, logging, resilience]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Error Handling

Build resilient Python applications that fail gracefully and provide clear observability.

## Trigger Signals 🧯

Use this skill when:

- Designing a new module or service
- Hardening existing code against production failures
- Refactoring complex `try-except` blocks
- Implementing retry logic for external dependencies (APIs, databases)
- Improving observability through structured logging

## Workflow Checklist ✅

- [ ] Define a base exception for the domain/module
- [ ] Implement structured custom exceptions with context
- [ ] Use `contextlib` for clean resource management
- [ ] Apply appropriate logging levels (DEBUG, INFO, ERROR)
- [ ] Design recoverability boundaries for background tasks
- [ ] Implement exponential backoff for transient failures

## Custom Exceptions 🏗️

- **Base Exception**: Always create a top-level exception for your module.
- **Granularity**: Use specific sub-exceptions instead of generic ones.
- **Context**: Pass metadata (ID, code, payload) into exception constructors.

```python
class MyDomainError(Exception):
    """Base exception for all my-domain errors."""
    pass

class ResourceNotFoundError(MyDomainError):
    def __init__(self, resource_id: str, message: str = "Resource not found"):
        self.resource_id = resource_id
        super().__init__(f"{message}: {resource_id}")
```

## Context Management 🛡️

- **Cleanup**: Use `with` blocks or `@contextmanager` to ensure resources are closed.
- **Suppression**: Use `contextlib.suppress` only when the failure is truly expected and safe to ignore.
- **Lifecycle**: Implement `__enter__` and `__exit__` for complex state management.

## Observability & Logging 📊

- **Structured Logging**: Prefer `structlog` or JSON formatters for machine-readability.
- **Correlation IDs**: Pass IDs through the stack to trace requests across services.
- **Levels**:
  - `DEBUG`: Verbose internal state for developers.
  - `INFO`: Significant lifecycle events (start/stop, successful high-level ops).
  - `WARNING`: Recoverable issues or unexpected but handled states.
  - `ERROR`: Unrecoverable in current path, requires investigation.

## Resilience & Retries 🔄

- **Jitter**: Always add randomness to backoff to avoid thundering herd.
- **Idempotency**: Ensure retried operations are safe to run multiple times.
- **Timeouts**: Never wait indefinitely; use explicit `timeout` parameters.

## Red Flags 🚨

- Bare `except:` blocks (catches `SystemExit` and `KeyboardInterrupt`)
- Swallowing exceptions without logging or re-raising
- Log-and-throw (leads to duplicate logs); choose one
- Using exceptions for normal control flow
- Hardcoded retry counts without backoff

## Exit Criteria 🏁

- Every potential failure point has a defined outcome (retry, fail-fast, or recover).
- Logs provide enough context to diagnose failures without a debugger.
- Resources (files, sockets, DB connections) are guaranteed to close.
