---
name: frontend-review
description: >
  Deep frontend code review focused on design quality, component architecture,
  accessibility, performance, responsive behavior, and UX consistency. Use when
  the user asks for a review of frontend code, UI components, or web pages.
domain: frontend
version: 1.0.0
tags: [frontend, review, accessibility, performance, components, ux, css]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Frontend Review

Perform a rigorous, multi-dimensional review of frontend code. Evaluate visual quality, component architecture, accessibility, performance, responsiveness, and UX patterns. Deliver actionable findings ranked by severity.

The user provides frontend code to review: components, pages, stylesheets, or entire frontend modules. They may point to specific files, a diff, or a branch.

## Review Dimensions

Analyze the code across all of these dimensions:

### 1. Design Quality & Consistency

- **Visual coherence**: Does the UI have a clear, intentional aesthetic? Or does it feel generic/default?
- **Typography**: Are font choices distinctive and well-paired? Are sizes, weights, and line-heights systematic?
- **Color system**: Is there a cohesive palette with CSS variables? Are contrast ratios sufficient?
- **Spacing & rhythm**: Is spacing consistent and intentional? Does vertical rhythm hold?
- **Component consistency**: Do similar elements look and behave the same way throughout?

### 2. Component Architecture

- **Composition**: Are components properly decomposed? Too granular? Too monolithic?
- **Props API**: Are component interfaces clean, typed, and well-documented?
- **State management**: Is state co-located appropriately? Are there unnecessary re-renders?
- **Reusability**: Are components generic enough to reuse, or tightly coupled to specific contexts?
- **Separation of concerns**: Is logic cleanly separated from presentation?

### 3. Accessibility (a11y)

- **Semantic HTML**: Are elements used for their intended purpose (`<button>`, `<nav>`, `<main>`, etc.)?
- **ARIA**: Are ARIA labels, roles, and states applied correctly where needed?
- **Keyboard navigation**: Can all interactive elements be reached and operated via keyboard?
- **Focus management**: Are focus states visible? Is focus trapped correctly in modals/drawers?
- **Screen reader**: Will the content make sense when read aloud in order?
- **Color contrast**: Do text and interactive elements meet WCAG AA (4.5:1 body, 3:1 large text)?

### 4. Performance

- **Bundle impact**: Are imports tree-shakeable? Are large libraries justified?
- **Render efficiency**: Are expensive computations memoized? Are lists virtualized when large?
- **Image handling**: Are images optimized, lazy-loaded, and properly sized?
- **CSS efficiency**: Are styles scoped? Is there excessive specificity or duplication?
- **Loading states**: Are skeleton screens or progressive loading used for async content?
- **Layout shifts**: Will the page experience CLS (Cumulative Layout Shift)?

### 5. Responsive & Cross-Browser

- **Breakpoints**: Does the layout adapt gracefully across mobile, tablet, and desktop?
- **Touch targets**: Are interactive elements at least 44x44px on touch devices?
- **Flexible layouts**: Are layouts using relative units, flexbox, or grid appropriately?
- **Overflow handling**: Is content clipped, scrollable, or wrapped correctly at all sizes?

### 6. UX Patterns

- **Feedback**: Do actions provide immediate visual feedback (loading, success, error states)?
- **Error handling**: Are form errors, network failures, and edge cases handled gracefully?
- **Micro-interactions**: Are animations purposeful and performant (not gratuitous)?
- **Navigation**: Is information architecture clear? Can users always orient themselves?
- **Empty states**: Are zero-data states designed and helpful (not blank)?

## Severity Scale

- **Critical**: Broken functionality, accessibility violations that block users, security issues
- **High**: Significant UX problems, major performance bottlenecks, architectural anti-patterns
- **Medium**: Design inconsistencies, missing responsive handling, suboptimal patterns
- **Low**: Minor style issues, small improvements, code hygiene
- **Nit**: Personal preference, optional polish

## Output Format

### Findings Table

| # | Severity | Dimension | File:Line | Finding | Recommendation |
|---|----------|-----------|-----------|---------|----------------|
| 1 | Critical | a11y | `Button.tsx:12` | Button uses `<div onClick>` instead of `<button>` | Use semantic `<button>` element |
| ... | ... | ... | ... | ... | ... |

### Scorecard

| Dimension | Score (1-10) | Key Issue |
|-----------|:---:|-----------|
| Design Quality | — | — |
| Component Architecture | — | — |
| Accessibility | — | — |
| Performance | — | — |
| Responsive | — | — |
| UX Patterns | — | — |
| **Overall** | **—** | — |

### Verdict

One of:
- **Ship It** (9-10): Exceptional frontend work, no significant issues
- **Approve with Comments** (7-8): Solid work, minor improvements suggested
- **Request Changes** (5-6): Notable issues that should be addressed before shipping
- **Block** (<5): Significant problems that must be fixed

### Top 3 Priority Fixes

List the three most impactful changes in order of priority, with specific code suggestions.
