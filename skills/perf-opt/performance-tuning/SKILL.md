---
name: performance-tuning
description: >
  Performance optimization workflow for profiling, bottleneck analysis, query
  reduction, rendering efficiency, memory pressure, and measurable speedups.
  Use when the task is slow, expensive, or scaling poorly.
domain: perf-opt
version: 1.0.0
tags: [performance, profiling, bottlenecks, latency, memory, optimization]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Performance Tuning

Optimize the actual bottleneck, then prove the win.

## Trigger Conditions ⏱️

- Slow page loads or API endpoints
- CPU spikes, memory growth, or hot loops
- Database bottlenecks or repeated fetches
- Expensive builds, CI runs, or background jobs

## Performance Process 📈

1. Define the metric: latency, throughput, memory, CPU, bundle size, or cost.
2. Capture a baseline before changing code.
3. Profile to find the dominant bottleneck.
4. Fix the highest-leverage issue first.
5. Re-measure and report the delta.

## Measurement Checklist ✅

- [ ] Baseline recorded with input size and environment
- [ ] Profiling data collected from the real hot path
- [ ] Optimization targeted the measured bottleneck
- [ ] Result compared before vs. after
- [ ] Readability and correctness preserved

## Common Bottlenecks 🔍

### Backend

- N+1 queries
- Repeated JSON parsing or serialization
- Blocking I/O in parallelizable paths
- Large object copies and unnecessary allocations

### Frontend

- Over-rendering
- Heavy client bundles
- Waterfall data fetching
- Expensive layout thrash or animation work

### CI / Tooling

- Reinstalling unchanged dependencies
- Missing cache keys
- Redundant matrix jobs
- Slow tests in the default path

## Example Optimization Frame 🛠️

```text
Metric: p95 /build latency
Baseline: 4.2s on 500 skills
Profiler finding: repeated file parsing inside nested adapter loops
Change: cache parsed frontmatter and reuse during build
Result: 1.8s p95, 57% faster
```

## Guardrails 🧱

- Do not optimize without a metric.
- Do not trade correctness for speed silently.
- Avoid premature abstraction justified only by possible future scale.
- Keep the simplest implementation that meets the target.

## Red Flags 🚨

- Micro-optimizing cold paths
- Using benchmarks without representative inputs
- Reporting percentage gains without absolute numbers
- Ignoring memory or maintenance costs of the optimization

## Final Standard 🏁

Every performance claim should answer:

1. What was slow?
2. What proved it?
3. How much better is it now?
