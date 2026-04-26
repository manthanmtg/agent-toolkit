# Project Guidelines Sync Prompt

## Objective

Keep `CLAUDE.md` and `AGENTS.md` aligned with the actual Agent Toolkit codebase and workflow.

## Workflow

### 1. Audit for Drift

Review one recent area of change:

- `git log --oneline -10`.
- `package.json` for scripts and dependencies.
- `app/`, `lib/`, `skills/`, `profiles/`, `prompts/`, and `issues_to_look/` for major workflow or structure changes.
- Existing conventions in nearby code before documenting a rule.

### 2. Update Only With Evidence

Make a small update if:

- A command, setup step, dependency, or environment variable changed.
- A major directory, route, adapter, action group, skill workflow, or profile workflow changed.
- A repeated implementation pattern has become a real convention.
- Existing guidance contradicts the current repository.

Do not add aspirational rules that the codebase does not follow.

### 3. Keep Scope Tight

- Change only `CLAUDE.md`, `AGENTS.md`, or an `issues_to_look/` note created by this run.
- Keep `AGENTS.md` concise and consistent with `CLAUDE.md`.
- If the needed update requires understanding a large unfinished feature, log the uncertainty and stop.

### 4. Verify

- Run `git diff --check`.
- Run affected documented commands if the update changes command guidance.

### 5. Commit

Use a message like `docs(guidelines): sync agent instructions with prompt workflow`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
