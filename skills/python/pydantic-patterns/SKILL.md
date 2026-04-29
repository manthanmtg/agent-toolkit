---
name: pydantic-patterns
description: >
  Use when adding or maintaining Python data models that must validate input
  safely, serialize consistently, and scale across generic payloads and
  discriminated union workflows.
domain: python
version: 1.0.0
tags: [python, pydantic, validation, typing]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Pydantic Patterns

## Model Definition

- Prefer `model_validator(mode="before")` for pre-processing raw data only
  when normalization before validation is required
- Prefer `Field(...)` with explicit descriptions for API-facing models
- Use `ConfigDict(strict=True)` only when strict coercion behavior is
  explicitly desired

## Validators

- Use `@field_validator` for single-field validation
- Use `@model_validator(mode="after")` for cross-field validation
- Always return the value from field validators

## Serialization

- Use `model_dump(mode="json")` for JSON-safe output
- Define `model_serializer` for custom serialization logic
- Use `AliasGenerator` for camelCase API responses

## Generic Models

```python
from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")

class Response(BaseModel, Generic[T]):
    data: T
    success: bool = True
```

## Discriminated Unions

- Use `Discriminator` with a literal type field for performance
- Prefer `Tagged` unions over plain `Union` types
