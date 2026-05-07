---
name: nextjs-patterns
description: >
  Next.js 15 (App Router) workflow for Server Components, Server Actions,
  data fetching, caching, and layout composition. Use when building or
  reviewing fullstack React applications with high-performance defaults.
domain: typescript
version: 1.2.0
tags: [typescript, nextjs, react, server-actions, server-components, web]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Next.js 15: App Router Patterns

Build fast, secure, and maintainable web applications using Next.js 15 and React 19.

## Core Pillars 🏛️

- **Server Components (RSC)**: Default for performance and security.
- **Server Actions**: Unified data mutation with type safety.
- **Client Components**: Interactivity only where needed.
- **Streaming**: Incremental UI delivery with Suspense.
- **Async APIs**: Dynamic request data is now asynchronous.

## Component Strategy 🏗️

### Server Components (Default)

- Use for data fetching, sensitive logic, and large dependencies.
- Render Server Components directly in `page.tsx` or `layout.tsx`.
- Keep the bundle size small by moving non-interactive code to the server.

### Client Components

- Use `"use client"` at the top of the file for interactivity (hooks, event listeners).
- Keep client components as leaf nodes to maximize server-side rendering.
- Pass serializable data (no functions/classes) from server to client.

## Data Fetching & Caching 📥

- Fetch data directly in async Server Components.
- Use `fetch` with Next.js extensions for fine-grained caching.
- Prefer `revalidatePath` or `revalidateTag` for on-demand cache clearing.

### Async Request APIs (Next.js 15+)

In Next.js 15, request-specific APIs are asynchronous. Always `await` them before accessing properties.

- `headers()`
- `cookies()`
- `params` (in `Page` or `Layout` props)
- `searchParams` (in `Page` props)

```typescript
// app/blog/[slug]/page.tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const { query } = await searchParams;
  // ...
}
```

## Server Actions ⚡

- Use `"use server"` at the top of a file or function.
- Always validate input using Zod or a similar schema validator.
- Handle errors gracefully and return structured results instead of throwing.
- Use `useActionState` (React 19) for form state and feedback.

```typescript
// lib/actions.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const Schema = z.object({ email: z.string().email() });

export async function subscribe(prevState: any, formData: FormData) {
  const validated = Schema.safeParse({ email: formData.get("email") });
  if (!validated.success) return { error: "Invalid email" };

  await db.subscribe(validated.data.email);
  revalidatePath("/");
  return { success: true };
}
```

## Layouts & Navigation 🗺️

- Use `layout.tsx` for persistent UI (navigation, sidebars) that doesn't re-render.
- Use `loading.tsx` for automatic Suspense boundaries during data fetching.
- Use `error.tsx` for granular error handling.
- Metadata should be exported from `page.tsx` or `layout.tsx`.

## Workflow Checklist ✅

- [ ] Fetch data in Server Components where possible
- [ ] Minimize "use client" usage
- [ ] Await async request APIs (`params`, `searchParams`, `headers`, `cookies`)
- [ ] Validate Server Action inputs with Zod
- [ ] Use `Suspense` and `loading.tsx` for a responsive UI
- [ ] Set appropriate caching headers (`force-dynamic`, `revalidate`)
- [ ] Use `revalidatePath` after successful mutations

## Red Flags 🚨

- Overusing `"use client"` when server components would suffice
- Using `headers()`, `cookies()`, `params`, or `searchParams` synchronously in Next.js 15
- Throwing errors from Server Actions instead of returning them
- Passing non-serializable data across the server-client boundary
- Neglecting `loading.tsx` for slow data fetches
- Hardcoding URLs instead of using environment variables

## Final Standard 🏁

A high-quality Next.js application leverages the server for logic and the client for interactivity, ensuring speed, security, and a great developer experience.
