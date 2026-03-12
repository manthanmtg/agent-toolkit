---
name: weekly-work-review
description: >
  Generate a comprehensive weekly work review for a person by aggregating activity
  from Slack (messages, threads, reactions) and Atlassian (Jira tickets, status changes,
  comments, Confluence edits). Use when the user asks for a weekly summary, work log,
  standup recap, or weekly review.
domain: productivity-work
version: 1.0.0
tags: [productivity, weekly-review, slack, jira, atlassian, work-log, standup]
author: agent-toolkit
activation:
  claude-code: model
  cursor: auto
  windsurf: model_decision
  opencode: model
  codex: auto
---

# Weekly Work Review

You are generating a **comprehensive weekly work review** for a person. Your job is to pull activity data from Slack and Atlassian (Jira + Confluence) via their MCP servers, then synthesize everything into a structured, actionable summary.

---

## Step 0 — Identify the Person & Time Range

1. **Person ID / Name**: If the user provides a person ID, username, or email — use it. Otherwise, determine the current user's identity from the system (e.g., `whoami`, git config `user.name` / `user.email`, or ask the user).

2. **Time Range**: Default to the **last 7 days** (Monday–Sunday of the current or previous week). If the user specifies a different range, use that instead.

3. **Confirm** the person and date range before proceeding:
   > Generating weekly review for **{name}** — {start_date} to {end_date}

---

## Step 1 — Gather Data from Slack MCP

Use the **Slack MCP server** to retrieve the person's activity. Collect:

### 1a. Messages Sent
- Fetch messages authored by the person across all accessible channels in the date range.
- Record: **channel**, **timestamp**, **message snippet** (first ~100 chars), **thread reply count**.

### 1b. Threads Participated In
- Identify threads where the person posted replies (even if they didn't start the thread).
- Record: **channel**, **thread topic** (parent message snippet), **number of replies by person**.

### 1c. Channels Active In
- List all unique channels where the person posted or reacted.
- Categorize: project channels, team channels, social/general, DM groups (if accessible).

### 1d. Key Discussions
- Identify the **top 5 longest threads** the person participated in (by their message count in that thread).
- These represent the person's most engaged conversations of the week.

---

## Step 2 — Gather Data from Atlassian MCP (Jira)

Use the **Atlassian MCP server** to retrieve Jira activity. Collect:

### 2a. Tickets Worked On
- Fetch all Jira issues where the person is the **assignee** and that had **any status change, comment, or update** in the date range.
- For each ticket, record:
  - **Key** (e.g., `PROJ-123`)
  - **Summary** (title)
  - **Type** (Bug, Story, Task, Epic, Sub-task)
  - **Status transitions** during the week (e.g., `In Progress → In Review → Done`)
  - **Priority** (Blocker, Critical, Major, Minor, Trivial)

### 2b. Tickets Created
- Fetch issues **created by** the person in the date range.
- Record: **key**, **summary**, **type**, **current status**.

### 2c. Tickets Completed
- Fetch issues moved to a **Done/Closed/Resolved** status by the person during the date range.
- This is the "shipped" list.

### 2d. Comments & Activity
- Fetch comments authored by the person on any Jira ticket in the date range.
- Record: **ticket key**, **comment snippet** (first ~80 chars), **timestamp**.

### 2e. Tickets In Review / Blocked
- Identify tickets assigned to the person currently in **Review**, **Blocked**, or **Waiting** states.
- These are carry-over items needing attention.

---

## Step 3 — Gather Data from Atlassian MCP (Confluence) *(Optional)*

If Confluence access is available:

- Fetch pages **created or edited** by the person in the date range.
- Record: **space**, **page title**, **action** (created / updated), **timestamp**.

---

## Step 4 — Synthesize the Weekly Review

Combine all gathered data into the following structured report.

---

### Weekly Work Review: {Person Name}

**Period:** {start_date} — {end_date}
**Generated:** {current_timestamp}

---

### Executive Summary

> Write a 3–5 sentence paragraph summarizing the person's week: what they primarily focused on, key accomplishments, collaboration patterns, and any blockers or carry-over work.

---

### Tickets Completed (Shipped)

| # | Ticket | Type | Summary | Priority |
|---|--------|------|---------|----------|
| 1 | `PROJ-123` | Story | Implement user auth flow | Major |
| ... | ... | ... | ... | ... |

**Total shipped:** {count}

---

### Tickets In Progress

| # | Ticket | Type | Summary | Status | Priority |
|---|--------|------|---------|--------|----------|
| 1 | `PROJ-456` | Bug | Fix login redirect loop | In Review | Critical |
| ... | ... | ... | ... | ... | ... |

---

### Tickets Created

| # | Ticket | Type | Summary | Current Status |
|---|--------|------|---------|----------------|
| 1 | `PROJ-789` | Task | Update deployment docs | To Do |
| ... | ... | ... | ... | ... |

---

### Blocked / Needs Attention

| Ticket | Summary | Status | Blocker Reason (if known) |
|--------|---------|--------|---------------------------|
| `PROJ-101` | DB migration for v2 | Blocked | Waiting on DBA review |

---

### Slack Activity Summary

| Metric | Count |
|--------|-------|
| Messages sent | {n} |
| Channels active in | {n} |
| Threads participated in | {n} |

**Most Active Channels:**
1. `#channel-name` — {n} messages
2. ...

**Key Discussions:**

| # | Channel | Topic | Messages by {person} |
|---|---------|-------|----------------------|
| 1 | `#backend` | API rate limiting design | 12 |
| ... | ... | ... | ... |

---

### Confluence Activity *(if available)*

| # | Space | Page Title | Action | Date |
|---|-------|------------|--------|------|
| 1 | Engineering | RFC: Auth Redesign | Created | 2025-01-15 |
| ... | ... | ... | ... | ... |

---

### Work Themes

Categorize the person's work into **3–5 themes** based on the tickets, discussions, and documents. For example:

- **Authentication Overhaul** — 4 tickets, 2 Slack threads, 1 Confluence doc
- **Bug Fixes & Stability** — 3 tickets resolved
- **Team Collaboration** — Active in 8 channels, helped on 5 threads

---

### Carry-Over & Next Week

List items that are **not yet done** and will likely carry into next week:

1. `PROJ-456` — Fix login redirect loop (In Review)
2. `PROJ-202` — Write integration tests for payments (In Progress)
3. ...

---

### Weekly Stats

| Metric | Value |
|--------|-------|
| Jira tickets completed | {n} |
| Jira tickets created | {n} |
| Jira tickets in progress | {n} |
| Jira comments made | {n} |
| Slack messages sent | {n} |
| Slack threads participated | {n} |
| Confluence pages touched | {n} |

---

## Guidelines

- **Be factual** — only report what the data shows. Do not infer intent or sentiment.
- **Respect privacy** — do not include DM content. Stick to channels and public Jira data.
- **Handle missing data gracefully** — if Slack MCP or Atlassian MCP is unavailable, skip that section and note it: *"Slack data unavailable — Slack MCP server not connected."*
- **Date math** — always use the person's local timezone if determinable, otherwise UTC.
- **Disambiguate users** — if the person ID maps to different usernames across Slack and Jira, resolve them. Ask the user if ambiguous.
- **Large volumes** — if there are more than 50 tickets or 200 Slack messages, summarize rather than listing every item. Focus on the most significant activity.
- **No hallucination** — if you cannot fetch data from an MCP server, say so. Never fabricate tickets, messages, or activity.
