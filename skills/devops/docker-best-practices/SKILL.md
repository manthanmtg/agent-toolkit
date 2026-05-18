---
name: docker-best-practices
description: >
  Docker best practices for building efficient, secure, and reproducible
  container images. Use when reviewing, authoring, or optimizing Dockerfiles
  and container build pipelines.
domain: devops
version: 1.1.0
tags: [docker, containers, devops, security]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Docker Best Practices

Build efficient, secure, and reproducible container images.

## Trigger Signals 🎯

Use this skill when:
- Authoring a new `Dockerfile` or `docker-compose.yml`
- Reviewing or optimizing an existing container image
- Hardening container security for production
- Fixing slow container build pipelines
- Minimizing image size and layer count

## Layer Caching 🗄️

- Order Dockerfile instructions from least to most frequently changed.
- Copy dependency manifests before source code: `COPY package.json .` then `RUN npm ci`.
- Use `.dockerignore` to exclude unnecessary files like `node_modules`, `.git`, and build logs.

## Multi-Stage Builds 🏗️

- Use multi-stage builds to separate build-time tools from the production runtime.
- Name stages for clarity: `FROM node:20-slim AS builder`.
- Copy only the final artifacts (e.g., `dist/`, `.next/`, `node_modules/`) into the minimal runtime stage.

```dockerfile
# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

## Security & Reliability 🛡️

- **Non-Root User**: Never run as root. Create a dedicated user (`USER appuser`).
- **Immutable Tags**: Use specific versions or digests (`node:20.11-slim@sha256:...`) instead of `latest`.
- **Secrets**: Use `RUN --mount=type=secret` for build-time secrets. Never use `ARG` or `ENV` for sensitive data.
- **Minimal Image**: Prefer `-slim` or `-alpine` variants to reduce the attack surface.

## Workflow Checklist ✅

- [ ] Base images are pinned to a digest or immutable tag.
- [ ] Security-sensitive values never enter image layers (`ARG`, `COPY`, logs).
- [ ] Build artifacts are copied without full source tree or dev dependencies.
- [ ] Runtime image uses a non-root user and minimal dependencies.
- [ ] Health checks and observability are defined where relevant.
- [ ] `.dockerignore` is present and excludes local development artifacts.

## Red Flags 🚨

- Using `FROM latest` or omitting tags entirely.
- Running containers as the `root` user in production.
- Including secrets, API keys, or `.env` files in image layers.
- Large images (e.g., >1GB) caused by missing multi-stage builds.
- Installing compilers or build tools in the final production image.
- Storing persistent data inside the container instead of using volumes.

## Final Standard 🏁

A professional container image is minimal, secure, and reproducible. It contains only the files necessary to run the application, runs as a non-root user, and follows a predictable build process that leverages caching effectively.
