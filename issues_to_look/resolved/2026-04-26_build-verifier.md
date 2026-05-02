---
date: 2026-04-26
domain: build
source: prompts/build_verifier.md
status: blocked
---

# Build verifier: Turbopack panic due missing `server-external-packages.jsonc`

## Issue
Running `npm run build` fails before typechecking/linting/test execution due a Turbopack panic:

- `Error [TurbopackInternalError]: Failed to write app endpoint /page`
- `File not found: "[project]/node_modules/next/dist/lib/server-external-packages.jsonc"`
- Next resolves package version as `15.5.12`, but the build output reports `Next.js 16.1.6 (Turbopack)` in this environment and expects a `.jsonc` resource that is missing (`server-external-packages.json` exists instead).

## Evidence
See command output from `npm run build` in this run.

## Suggested fix
Likely dependency/toolchain mismatch. A clean reinstall/re-alignment of Next/Turbopack artifacts or a version pin that matches the emitted lockfile build path is likely required. As a fallback, using non-Turbopack build settings should be considered.

## Why held back
The failure appears to be caused by a local Next.js/Turbopack internal packaging expectation rather than an obvious one-file app change. I did not make code changes because a local regression fix here may be unrelated to the repository source and could hide upstream build-system drift.
