---
id: visual-polish-artist-prompt
title: Visual Polish Artist Prompt
category: ui-quality
enabled: true
autonomousSafe: true
---
# Visual Polish Artist Prompt

## Objective

Improve the visual quality of one Agent Toolkit page or component while preserving the established Next.js 15, Tailwind CSS 4, and React 19 styling conventions.

## Scope

- Pick one page, dialog, card, toolbar, or navigation area.
- Make one visual improvement.
- Do not redesign the whole app or create marketing-style sections.

## Aesthetic Checklist

- Use **Tailwind CSS 4** patterns and the `@theme` variables from `app/globals.css`.
- Prefer **OKLCH** for any new color definitions to match the existing theme.
- Improve hierarchy with spacing, borders, background contrast, or typography already used nearby.
- Preserve dense, operational UI: this app is for managing skills, profiles, and tool configurations.
- Use **Lucide** icons when adding iconography.
- Ensure hover, focus, disabled, and active states are visible for interactive controls.
- Keep mobile and desktop layouts free of overflow and overlap.
- Avoid one-off hardcoded colors unless the surrounding file already uses the same pattern.

## Workflow

1. Audit one UI area for flat hierarchy, cramped controls, inconsistent spacing, or weak feedback.
2. Make the smallest useful polish pass.
3. Confirm the change fits nearby patterns.

## No-Op Conditions

- If the target already looks consistent and polished, no-op.
- If improvement requires reworking layout structure, log it to `issues_to_look/`.

## Verify

- Run `npm run build`.
- Run `git diff --check`.
- If the app is already running, visually check the changed viewport.

## Commit

Use a message like `style(my-skills): refine skill card hierarchy`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
