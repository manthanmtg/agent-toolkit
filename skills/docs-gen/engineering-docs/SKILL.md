---
name: engineering-docs
description: >
  Documentation workflow for READMEs, API docs, runbooks, changelogs, migration
  notes, and architecture summaries. Use when the user needs concise, accurate,
  high-signal engineering documentation from existing code or changes.
domain: docs-gen
version: 1.0.0
tags: [docs, readme, api, changelog, runbook, architecture]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Engineering Docs

Write documentation that reduces future questions.

## Best Use Cases 📝

- README refreshes
- API or route documentation
- Changelogs and release notes
- On-call runbooks and deployment notes
- Architecture summaries for complex flows

## Documentation Principles 📚

- Start with reader intent: setup, operate, integrate, troubleshoot, or review change.
- Prefer concrete examples over abstract promises.
- Document current behavior only; verify against the code.
- Keep tone crisp and operational.

## Authoring Checklist ✅

- [ ] Audience identified
- [ ] Inputs verified from source code, config, or tests
- [ ] Happy path shown with a runnable example
- [ ] Failure modes or caveats documented
- [ ] Commands, env vars, and file paths formatted clearly
- [ ] Outdated claims removed instead of patched around

## Recommended Structure 🧱

### README

1. What it does
2. Quick start
3. Core commands
4. Key architecture notes
5. Troubleshooting

### API docs

- Endpoint or function signature
- Request / response shape
- Auth requirements
- Error cases
- Example request and response

### Changelog

- Added
- Changed
- Fixed
- Security

## Example Snippet ✨

```md
## Build a Profile

Run:

~~~bash
npm run build
~~~

This compiles selected skills into `dist/<tool>/` and validates frontmatter before
writing output files.
```

## Quality Bar 🎯

Strong docs answer:

- What is this for?
- How do I use it now?
- What breaks if I use it wrong?
- Where do I look when it fails?

## Red Flags 🚨

- Repeating the code without adding meaning
- Promising behavior not verified in the repo
- Huge walls of prose without examples
- Changelogs that list implementation noise instead of user impact

## Final Standard 🏁

Good documentation compresses onboarding, support, and review time.
