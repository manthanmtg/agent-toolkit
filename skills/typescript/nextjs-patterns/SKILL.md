---
name: nextjs-patterns
description: >
  Next.js 15 App Router patterns including Server Components, Server Actions,
  data fetching, caching, and layout composition.
domain: typescript
version: 1.0.0
tags: [typescript, nextjs, react, web]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Next.js Patterns

## Server Components (default)

- Components are Server Components by default — no "use client" needed
- Fetch data directly in components using async/await
- Use `loading.tsx` and `error.tsx` for Suspense boundaries

## Client Components

- Add "use client" only when needed (interactivity, hooks, browser APIs)
- Keep client components as leaf nodes in the component tree
- Pass server data as props to client components

## Server Actions

- Use "use server" for mutations (form submissions, data writes)
- Always validate input with Zod before processing
- Return structured results, not thrown errors

## Data Fetching

- Use `fetch` with built-in caching: `{ next: { revalidate: 60 } }`
- For dynamic data: `{ cache: "no-store" }`
- Parallel fetch with `Promise.all` when requests are independent

## Layouts

- Use `layout.tsx` for shared UI (sidebar, navigation)
- Use `template.tsx` when re-mounting is needed on navigation
- Metadata is defined with `export const metadata` or `generateMetadata`
