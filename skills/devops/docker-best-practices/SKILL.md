---
name: docker-best-practices
description: >
  Docker best practices for building efficient, secure, and reproducible
  container images including multi-stage builds, layer caching, and security.
domain: devops
version: 1.0.0
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

## Multi-Stage Builds

- Use multi-stage builds to separate build and runtime dependencies
- Name stages for clarity: `FROM node:20-slim AS builder`
- Copy only artifacts needed for production into the final stage

## Layer Caching

- Order Dockerfile instructions from least to most frequently changed
- Copy dependency manifests before source code: `COPY package.json .` then `RUN npm ci`
- Use `.dockerignore` to exclude unnecessary files

## Security

- Never run as root: `USER node` or create a dedicated user
- Use specific image tags, not `latest`
- Scan images for vulnerabilities with `docker scout` or `trivy`
- Don't store secrets in images — use build secrets or runtime env vars

## Image Size

- Prefer `-slim` or `-alpine` base images
- Remove package manager caches in the same RUN layer
- Use `--no-install-recommends` for apt-get
