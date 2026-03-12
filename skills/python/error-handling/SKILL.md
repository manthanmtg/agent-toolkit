---
name: error-handling
description: >
  Python error handling patterns including custom exceptions, context managers,
  structured logging, and retry strategies.
domain: python
version: 1.0.0
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

## Custom Exceptions

- Create a base exception for each domain/module
- Include structured context (error codes, metadata) in exceptions
- Never use bare `except:` — always catch specific exceptions

## Context Managers

- Use `contextlib.contextmanager` for resource cleanup
- Implement `__enter__` / `__exit__` for classes that manage resources
- Use `contextlib.suppress` instead of empty except blocks

## Logging

- Use structured logging (e.g., `structlog`) over print statements
- Log at appropriate levels: DEBUG for development, INFO for operations, ERROR for failures
- Include correlation IDs in distributed systems

## Retry Strategies

- Use exponential backoff with jitter for network calls
- Set maximum retry counts to prevent infinite loops
- Make retry logic configurable, not hardcoded
