# Type Safety Enforcer Prompt

## Objective

Improve strict TypeScript safety in one file by replacing weak types, unsafe assertions, or suppressed errors with explicit types or validation.

## Workflow

### 1. Pick a Target

Search for weak boundaries:

```bash
rg "\\bany\\b|@ts-ignore|@ts-expect-error|as unknown as|Record<string, any>" app lib
```

Prefer:

- Adapter translation boundaries in `lib/adapters/`.
- Frontmatter, profile, and MCP parsing in `lib/types.ts`, `lib/registry.ts`, and `lib/actions/`.
- Server actions that receive form data or JSON-like input.

### 2. Audit

Check for:

- Untyped parsed data.
- Stringly typed tool IDs or adapter maps.
- Unsafe casts around YAML/frontmatter.
- Error values assumed to be `Error`.

### 3. Fix

- Replace 1-3 weak boundaries with proper interfaces, unions, Zod schemas, or `unknown` narrowing.
- Keep the change local.
- Do not reshape public types unless the current behavior is clearly wrong.

### 4. No-Op Conditions

- If three searched targets are already safe, log `type safety looks robust`.
- If correct typing requires changing major data contracts, log the issue instead of guessing.

### 5. Verify

- Run `npm run build`.
- Run `npm run test` if the changed path has tests.
- Run `git diff --check`.

### 6. Commit

Use a message like `chore(types): narrow profile yaml parsing`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
