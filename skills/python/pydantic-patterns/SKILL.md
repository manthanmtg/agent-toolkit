---
name: pydantic-patterns
description: >
  Use when adding or maintaining Python data models that must validate input
  safely, serialize consistently, and scale across generic payloads and
  discriminated union workflows. This skill focuses on Pydantic v2 best practices
  for type safety and performance.
domain: python
version: 1.1.0
tags: [python, pydantic, validation, typing, schemas]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Pydantic Patterns

Build robust, type-safe data schemas with Pydantic v2.

## Trigger Signals 🧯

Use this skill when:

- Defining API request/response schemas
- Parsing configuration files (YAML, JSON, TOML)
- Validating external data from webhooks or third-party services
- Managing complex data structures with nested models and unions
- Needing strict type enforcement in Python workflows

## Workflow Checklist ✅

- [ ] Use `BaseModel` for structured data objects
- [ ] Define field types explicitly using Python type hints
- [ ] Use `Annotated` with `Field` for metadata, descriptions, and constraints
- [ ] Implement `model_validator` for cross-field consistency
- [ ] Use `discriminated unions` for polymorphic data models
- [ ] Verify serialization behavior with `model_dump` and `model_dump_json`

## Model Definition 🏗️

- **Field Metadata**: Use `Field(...)` to provide descriptions, examples, and validation constraints (e.g., `gt`, `le`, `pattern`).
- **Immutability**: Use `ConfigDict(frozen=True)` for models that should not be modified after creation.
- **Strict Mode**: Use `ConfigDict(strict=True)` to disable loose type coercion (e.g., "1" -> 1).
- **Aliases**: Use `AliasGenerator` in `model_config` for consistent camelCase/snake_case conversion.

```python
from pydantic import BaseModel, Field, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel

class User(BaseModel):
    model_config = ConfigDict(
        frozen=True,
        strict=True,
        alias_generator=AliasGenerator(serialization_alias=to_camel)
    )

    id: int = Field(..., description="Unique user identifier")
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r"^\S+@\S+\.\S+$")
```

## Validation Patterns 🔍

- **Field Validators**: Use `@field_validator` for single-field logic. Always return the value.
- **Model Validators**: Use `@model_validator(mode="after")` for logic involving multiple fields.
- **Before Validators**: Use `@model_validator(mode="before")` for preprocessing raw input (e.g., renaming legacy keys).

```python
from pydantic import BaseModel, field_validator, model_validator

class Transaction(BaseModel):
    amount: float
    currency: str

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if v not in ["USD", "EUR", "GBP"]:
            raise ValueError("Unsupported currency")
        return v.upper()

    @model_validator(mode="after")
    def check_min_amount(self) -> "Transaction":
        if self.currency == "USD" and self.amount < 1.0:
            raise ValueError("Minimum USD transaction is $1.00")
        return self
```

## Advanced Patterns 🚀

### Discriminated Unions (Polymorphism)

Use a shared "type" field to efficiently route data to the correct sub-model.

```python
from typing import Literal, Union, Annotated
from pydantic import BaseModel, Field

class EmailNotification(BaseModel):
    type: Literal["email"] = "email"
    address: str

class SMSNotification(BaseModel):
    type: Literal["sms"] = "sms"
    phone: str

Notification = Annotated[
    Union[EmailNotification, SMSNotification],
    Field(discriminator="type")
]
```

### Generic Models

```python
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
```

## Serialization 📤

- Use `model_dump(mode="json")` for JSON-safe dictionary output (converts datetime/UUID to strings).
- Use `model_dump_json()` for a raw JSON string.
- Define `model_serializer` for custom serialization logic when standard aliases aren't enough.

## Red Flags 🚨

- Using bare `dict` instead of `BaseModel` for structured data
- Overusing `model_validator(mode="before")` when simple type hints or field validators suffice
- Forgetting to return the value in a validator
- Mixing Pydantic v1 and v2 syntax (e.g., `class Config:` vs `model_config = ...`)

## Exit Criteria 🏁

- Models accurately represent the data domain
- Validation covers edge cases and boundary conditions
- Serialization output matches the expected target format (e.g., API spec)
