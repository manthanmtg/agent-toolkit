---
id: accessibility-improver
title: Accessibility Improver Prompt
category: ui-quality
enabled: true
autonomousSafe: true
---
# Accessibility Improver Prompt

## Objective

Improve accessibility in one Agent Toolkit page or component.

## Workflow

### 1. Pick a Target

Choose one page or component from:

- `app/page.tsx`
- `app/skills/`
- `app/my-skills/`
- `app/add-skill/`
- `app/install/`
- `app/doctor/`
- `app/mcp/`
- `app/profiles/`
- `app/projects/`
- `app/settings/`
- shared UI such as `app/sidebar-nav.tsx`, `app/sync-button.tsx`, or dialogs.

### 2. Audit

Look for:

- Buttons or icon controls without accessible names.
- Inputs without labels.
- Missing dialog semantics or focus handling.
- Missing `aria-current`, `aria-expanded`, or `aria-describedby` where state needs narration.
- Poor keyboard focus visibility.
- Links opening external targets without safe `rel` attributes.
- Semantic opportunities for `main`, `nav`, `section`, `article`, or heading order.

### 3. Fix

- Fix 1-3 issues only.
- Preserve the existing visual design.
- Keep touch targets usable and keyboard states visible.

### 4. No-Op Conditions

- If three targets look solid, create `issues_to_look/YYYY-MM-DD_accessibility-healthy.md` with the files checked and the note `accessibility looks good`.
- If fixing an issue requires a structural redesign, log it to `issues_to_look/`.

### 5. Verify

- Run `npm run build`.
- Run `git diff --check`.
- Manually inspect keyboard behavior if the app is already running; do not start the server solely for this prompt unless needed.

### 6. Commit

Use a message like `a11y(skills): label tool filter controls`.

## Issue Management

Move resolved notes from `issues_to_look/` to `issues_to_look/resolved/`.
