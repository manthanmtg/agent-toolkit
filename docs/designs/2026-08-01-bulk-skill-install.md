# Bulk Skill Selection and Installation

## Goal

Add a safe bulk-install flow to the `/skills` catalog so a user can select
multiple skill cards, choose one common set of target tools, review the files
that will be created or replaced, and install the selection in one operation.

This is an additive product feature. It must preserve the existing catalog
browsing experience and the existing single-skill install action.

## Current State

- `app/skills/page.tsx` loads all toolkit and local skills on the server and
  passes serializable `Skill[]` data to the client-side catalog.
- `app/skills/skills-list.tsx` owns the source filter, domain grouping, and card
  rendering. Each card is currently a single link to its detail page.
- `app/skills/[domain]/[name]/install-skill-button.tsx` lets a user install one
  skill to several tools, but it has no review step and no bulk-skill support.
- `lib/actions/skills.ts` validates and executes single-skill installation. It
  loads the default profile, translates the skill with each adapter, checks
  output limits and paths, backs up some collisions, and writes atomically.
- `lib/types.ts` has `InstallSkillInputSchema` for one `{ domain, skillName }`
  plus a list of tools. The input does not identify whether the selected skill
  came from the toolkit or local registry.
- `lib/actions/skills.test.ts` covers one skill across one or several tools, a
  missing skill, Codex standalone output, and the unsupported AGENTS.md target.
- `app/mcp/export-all-dialog.tsx` and
  `app/mcp/import-all-dialog.tsx` provide the closest local patterns for modal
  layout, multi-selection, summaries, loading states, and result feedback.
- The five per-skill global targets are Claude Code, Cursor, Windsurf, OpenCode,
  and Codex. The AGENTS.md adapter intentionally produces no per-skill output.
- The current repository has 23 toolkit skills, no duplicate skill names across
  domains, and no declared `depends_on` relationships. The design still guards
  these cases for future registry growth.

## Requirements

### Functional Requirements

1. A user can enter and exit an explicit selection mode from `/skills`.
2. In selection mode, each visible skill card can be selected with mouse,
   touch, or keyboard without navigating to the detail page.
3. The user can select or deselect all skills matching the current source
   filter. Individual selections persist when the source filter changes.
4. The selection toolbar shows the total selected count and, when applicable,
   how many selected skills are hidden by the current filter.
5. The user can choose a common target set from Claude Code, Cursor, Windsurf,
   OpenCode, and Codex. At least one skill and one tool are required.
6. Before writing, the server builds a fresh install preview that reports files
   to create, files to replace, and blocking validation errors.
7. Every existing destination is treated conservatively as a replacement. The
   user must explicitly confirm replacements, and every replaced destination is
   backed up before writing.
8. Installation returns structured results for every selected skill/tool pair,
   including full success, partial output, failure, warnings, and files written.
9. Known preflight blockers prevent all writes. Runtime failures after execution
   starts may produce partial results, which the UI must explain clearly.
10. A fully successful operation clears selection mode. A partial or failed
    operation retains every skill that was not fully installed so the user can
    review errors and retry.
11. Existing single-skill installation remains API- and behavior-compatible.

### Non-Functional Requirements

- Keep filesystem access, adapter translation, validation, backups, and writes
  on the server. Client components receive only serializable summaries.
- Validate all Server Action inputs with strict Zod schemas.
- Preserve `isWithinPath()`, `checkCharacterLimit()`, `backupFile()`,
  `atomicWrite()`, and toolkit marker protections.
- Do not return generated skill content or undisguised home-directory paths to
  the browser. Display paths replace the home prefix with `~`.
- Execute writes sequentially for deterministic results and to avoid concurrent
  writes to shared marker directories.
- Support up to 100 selected skills and all five per-skill tools in one request.
- Use existing semantic color tokens, Lucide icons, light/dark themes, and the
  catalog's card visual language.
- All interactive targets must be at least 44px high, have visible focus state,
  and expose selected, disabled, loading, and error states semantically.

### Compatibility Requirements

- Do not change `/install`, profiles, `/my-skills`, uninstall behavior, adapter
  output formats, or installed destination paths.
- Keep `installSkillAction(domain, skillName, toolIds)` as the public action used
  by the detail page. Internally it may call the new shared installation service.
- Do not require a data migration or persisted browser state.

## Assumptions

- This feature installs registry skills globally, matching the current
  single-skill action. Project-scoped installation remains in `/install`.
- Every selected skill is installed to the same selected tools. A per-skill
  tool matrix is intentionally excluded from the first version.
- No tools are selected by default, matching the current detail-page behavior
  and preventing accidental writes.
- All five per-skill tools remain selectable even when tool detection has not
  found a binary or directory. The current action supports preparing their
  conventional global paths, and this plan does not change that behavior.
- A selected skill is identified by `{ source, domain, skillName }` so a local
  skill never silently resolves to a toolkit skill with the same path.
- Dependencies declared through `depends_on` are not added automatically. The
  current installer does not resolve dependencies, and silently expanding the
  user's selection would broaden the write set.
- Selection is ephemeral React state. Refreshing or navigating away clears it.
- A batch is not a cross-tool transaction. Atomic file writes and backups limit
  damage, but already completed targets are not rolled back after a later
  runtime failure.

## Approaches Considered

### 1. Inline catalog selection plus review dialog — selected

Add a selection mode to the existing grouped cards, show a sticky selection
toolbar, and open a two-stage review/install dialog.

Advantages:

- Matches the user's mental model and the supplied catalog screenshot.
- Keeps filtering, domain context, tags, descriptions, and source badges visible
  while choosing skills.
- Requires no new route and does not conflate an ad hoc selection with a profile.
- Allows a safe review step without making normal browsing more complex.

Trade-off: `SkillsList` gains coordination state, so the card and dialog should
be extracted into focused components rather than extending the current file
monolithically.

### 2. Dedicated bulk-install wizard route

Create a new route that repeats skill selection, tool selection, review, and
execution as a stepper.

Advantages: generous space for large selections and future project-scope
options. Trade-offs: duplicates the catalog UI, loses the user's current filter
and scroll context, and overlaps the existing `/install` route. This is more
navigation and implementation than the requested first version needs.

### 3. Temporary profile followed by the existing installer

Convert selected cards into a generated profile and call the profile build/link
pipeline.

Advantages: reuses broad build behavior. Trade-offs: mutates or invents profile
state for a one-time action, may install global/bundled outputs outside the
selected per-skill targets, and makes partial results difficult to attribute.
This approach is rejected.

## Proposed Design

### User Flow

1. The catalog header adds a secondary `Select skills` button beside `New Skill`.
2. Activating it switches card roots from navigation links to full-card checkbox
   labels. Cards gain a visible checkbox and selected border/background state.
3. A sticky toolbar appears below the source filters with:
   - `<N> selected`, plus `<M> hidden by filter` when non-zero;
   - `Select all visible` or `Deselect all visible`;
   - `Clear`;
   - `Cancel` to clear selection and leave selection mode;
   - the primary `Install selected` action.
4. `Install selected` opens `BulkInstallDialog` at its target-selection stage.
   The dialog shows a compact, scrollable list of selected skill names and a
   five-tool checkbox grid.
5. `Review installation` calls `previewSkillsInstallAction()`. The dialog moves
   to a review stage showing skill/tool/file counts, create/replace counts,
   blockers, and replacement confirmation when required.
6. The install button is disabled when preview blockers exist, replacement
   confirmation is missing, or the preview no longer matches the current dialog
   selection. Changing a tool returns the dialog to the target-selection stage
   and invalidates the old preview.
7. `Install <N> skills` calls `installSkillsAction()` once. The dialog becomes
   non-dismissible while the action is in flight and displays an indeterminate
   progress state with the requested skill and target counts.
8. The result stage groups outcomes by skill, with per-tool status badges and
   expandable warnings/errors. It provides:
   - `Done` after complete success;
   - `Back to targets` and `Close` after partial or failed execution.
9. Closing after a partial result retains only skills whose selected tool set was
   not fully successful. Fully successful skills are removed from selection.

### Selection Semantics

- The stable client key is `${source}:${domain}/${skillName}`.
- `SkillsList` owns `selectionMode`, `selectedKeys`, and dialog-open state.
- `filteredSkills` remains derived from the existing source filter.
- `Select all visible` performs a set union; it does not clear selected skills
  hidden by another filter.
- `Deselect all visible` subtracts only the currently filtered skills.
- `Clear` empties the set but remains in selection mode. `Cancel` clears the set
  and exits selection mode.
- Selection stops at `MAX_BULK_SKILLS = 100`. Individual and select-all actions
  announce the limit through a toast and do not create a partial hidden
  selection beyond the limit.
- When selection mode is off, the card remains the current detail-page link.
  When it is on, the card contains a native checkbox whose label spans the card;
  there is no nested link/button conflict.

### Dialog Accessibility and Responsive Behavior

- Use `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` title.
- Move focus to the first tool checkbox on open, trap Tab/Shift+Tab inside the
  dialog, support Escape before execution begins, and return focus to the
  `Install selected` trigger on close.
- Disable backdrop dismissal, Escape, close, and previous-stage actions during
  the write request. The visible loading text is announced with `aria-live`.
- Tool and card selection use native checkbox semantics; visual checkmarks and
  color reinforce state but are not the only indicators.
- The dialog is `max-h-[90vh]` with one internal scroll area and a visible footer.
  On narrow screens, toolbar actions wrap and the tool grid becomes one column.
- Use 150–200ms opacity/transform transitions and respect reduced motion. Do not
  use the existing card scale-hover animation while selection mode is active.

### Server and Data Flow

```text
SkillsList selection
  -> BulkInstallDialog targets
  -> previewSkillsInstallAction(validated refs + tools)
  -> buildSkillInstallPlan(load exact skills, translate, validate, inspect paths)
  -> sanitized preview
  -> explicit confirmation
  -> installSkillsAction(rebuild and revalidate plan)
  -> executeSkillInstallPlan(back up, atomic write, mark)
  -> per-skill/per-tool results
  -> result UI and selection reconciliation
```

#### Input Model

Add these shared definitions to `lib/types.ts`:

```ts
export const MAX_BULK_SKILLS = 100;

export const SkillInstallRefSchema = z.object({
  source: z.enum(["toolkit", "local"]),
  domain: IdentifierSchema,
  skillName: IdentifierSchema,
}).strict();

export const BulkSkillInstallInputSchema = z.object({
  skills: z.array(SkillInstallRefSchema).min(1).max(MAX_BULK_SKILLS),
  toolIds: ToolIdsSchema.min(1).max(5),
}).strict();

export const ConfirmedBulkSkillInstallInputSchema =
  BulkSkillInstallInputSchema.extend({
    confirmReplacements: z.boolean(),
  }).strict();
```

Both schemas additionally refine that skill refs and tool IDs are unique and
that `agents-md` is absent. Export inferred request types for client/action use.

#### Installation Service

Add `lib/skill-installer.ts` with server-only domain logic:

- `loadSkillForInstall(ref)` validates and loads from exactly `getSkillsDir()`
  or `getLocalSkillsDir()` according to `ref.source`.
- `buildSkillInstallPlan(input)` loads the default profile once, loads each skill
  once, translates every skill/tool pair, and creates internal plan entries.
- Each output entry records the ref, tool, relative path, absolute destination,
  generated content, scope, create/replace disposition, and blocker messages.
- A destination map detects when two selected outputs resolve to the same
  absolute path. Both entries receive a blocker that names the conflicting skill
  refs; no install can start until the user removes one.
- Every destination must pass `isWithinPath()`. Scoped content must pass
  `checkCharacterLimit()`. Empty adapter output and missing global paths are
  blockers.
- Existing destinations are classified as `replace-existing` without trusting
  the current directory-level toolkit marker as proof of per-file ownership.
- `toPublicInstallPreview(plan)` removes content and absolute paths, converts
  destinations to `~` display paths, and returns counts plus entry summaries.
- `executeSkillInstallPlan(plan, confirmReplacements)` first checks that the
  entire rebuilt plan is free of blockers and that replacements are confirmed.
  It performs no writes if either condition fails.
- Execution then processes skill/tool pairs and their outputs sequentially. It
  calls `backupFile()` for every existing destination, `atomicWrite()` for every
  output, and `writeToolkitMarker()` after a successful write.
- A marker failure is a warning because content was installed but ownership
  tracking degraded. A failed output after another output for the same pair
  produces a `partial` target status.

The service returns no raw content to its callers after mapping results. Public
result types use this shape:

```ts
type TargetInstallStatus = "installed" | "partial" | "failed";

interface BulkSkillInstallResult {
  status: "success" | "partial" | "failed";
  summary: {
    requestedSkills: number;
    requestedTools: number;
    installedTargets: number;
    partialTargets: number;
    failedTargets: number;
    filesWritten: number;
  };
  skills: Array<{
    skill: SkillInstallRef;
    status: TargetInstallStatus;
    targets: Array<{
      toolId: ToolId;
      status: TargetInstallStatus;
      filesWritten: number;
      warnings: string[];
      errors: string[];
    }>;
  }>;
  errors: string[];
}
```

#### Server Actions

Modify `lib/actions/skills.ts` to expose:

- `previewSkillsInstallAction(input)` — validates input, builds the plan, and
  returns a sanitized preview with structured input/blocker errors.
- `installSkillsAction(input)` — validates confirmation input, rebuilds the plan
  to prevent trusting client preview data, aborts before writes on preflight
  drift/blockers, and executes the plan.
- `installSkillAction(domain, skillName, toolIds)` — remains available with its
  current signature and return type. It resolves toolkit first and local second,
  then delegates to the service with the existing overwrite behavior so the
  detail page does not break.

Server Actions return structured failures rather than throwing expected
validation, collision, adapter, or filesystem errors. Unexpected exceptions are
formatted and logged once at the action boundary.

### Component Responsibilities

#### `app/skills/skills-list.tsx`

- Retain filtering, counts, grouping, empty states, and page header.
- Own selection mode and selected keys.
- Render the sticky selection toolbar and derive selected `SkillInstallRef[]`.
- Reconcile selection after dialog results.
- Pass only `selected`, `selectionMode`, and a stable toggle callback to each
  memoized card so unrelated cards do not rerender on every toggle.

#### `app/skills/skill-card.tsx`

- Move the existing card and `SourceBadge` out of `skills-list.tsx`.
- Render a `Link` in browse mode and a checkbox label in selection mode.
- Preserve description, tags, version, source badge, focus ring, and responsive
  card height. Add explicit selected and focus-visible states.

#### `app/skills/bulk-install-dialog.tsx`

- Own selected tools, dialog stage, preview, replacement confirmation, pending
  state, and result rendering.
- Invalidate preview when tools change.
- Call the two batch Server Actions and show inline recovery guidance.
- Notify `SkillsList` of fully successful versus retained skill refs on close.
- Reuse the modal surface, scrim, header, scroll body, and footer conventions in
  the MCP bulk dialogs without copying MCP-specific code.

## Files To Change

| File | Action | Detailed Change |
| ---- | ------ | --------------- |
| `lib/types.ts` | Modify | Add the maximum, exact-source ref schema, strict preview/install schemas, uniqueness and tool refinements, and inferred input types. |
| `lib/types.test.ts` | Modify | Add boundary, uniqueness, identifier, maximum-size, and unsupported-tool tests for the bulk schemas. |
| `lib/skill-installer.ts` | Add | Implement exact skill loading, plan construction, destination collision detection, preview sanitization, sequential safe execution, and structured result aggregation. |
| `lib/skill-installer.test.ts` | Add | Unit-test plan construction, collisions, create/replace classification, blockers, confirmation, backups, and result aggregation. |
| `lib/actions/skills.ts` | Modify | Add preview and batch-install actions, delegate shared work to the service, and preserve the single-skill action contract. |
| `lib/actions/skills.test.ts` | Modify | Add integration coverage for several skills across several tools, exact local/toolkit source resolution, invalid input, partial results, and single-action compatibility. |
| `app/skills/skills-list.tsx` | Modify | Add selection mode, stable selected keys, select-visible behavior, sticky toolbar, dialog orchestration, and post-result reconciliation; extract the card. |
| `app/skills/skill-card.tsx` | Add | Provide browse and accessible selection render modes for the catalog card. |
| `app/skills/bulk-install-dialog.tsx` | Add | Implement target selection, preview, replacement confirmation, loading, results, focus management, and responsive layout. |
| `app/skills/skills-list.test.tsx` | Add | Test selection/filter semantics, browse-vs-select card behavior, dialog stages, confirmation gating, and success/partial reconciliation. |
| `package.json` | Modify | Add `jsdom` and `@testing-library/user-event` as dev dependencies for interaction tests. |
| `package-lock.json` | Modify | Lock the two UI test dependencies. |
| `README.md` | Modify | Add bulk catalog installation to the feature list and describe the select-review-install flow briefly. |
| `PRD.md` | Modify | Update the `/skills` route description to include bulk selection and pre-install review. |

No files are deleted. `app/skills/page.tsx` and the detail-page install component
do not need UI changes.

## Implementation Phases

### Phase 1: Define Contracts and Test the Install Service

1. Add the exact-source ref and bulk request schemas to `lib/types.ts`.
2. Add failing bulk-schema cases to `lib/types.test.ts` for empty, duplicate,
   malformed, oversized, and AGENTS.md inputs.
3. Write failing service tests in `lib/skill-installer.test.ts` for:
   - two skills installed to two tools;
   - exact local versus toolkit loading;
   - duplicate output destinations;
   - path and character-limit blockers;
   - create versus replace preview counts;
   - replacement confirmation before any write;
   - backup-before-write ordering;
   - partial multi-output failure aggregation.
4. Implement `lib/skill-installer.ts` until these tests pass.

### Phase 2: Add Batch Server Actions Without Breaking Single Install

1. Add `previewSkillsInstallAction()` and `installSkillsAction()` to
   `lib/actions/skills.ts`.
2. Refactor `installSkillAction()` to delegate its output work while preserving
   its signature and `{ success, installed, errors }` response semantics.
3. Extend `lib/actions/skills.test.ts` with end-to-end filesystem assertions for
   the batch actions and regression assertions for the detail-page action.
4. Confirm expected errors are returned and unexpected errors are logged once.

### Phase 3: Add Catalog Selection Mode

1. Extract `SourceBadge` and the current card markup into
   `app/skills/skill-card.tsx` without changing browse-mode visuals.
2. Add selection state and stable source-aware keys to `SkillsList`.
3. Add the header trigger, sticky toolbar, select/deselect-visible behavior,
   hidden-selection count, limit handling, clear, and cancel.
4. Implement the native-checkbox selection card with keyboard focus and
   light/dark selected states.

### Phase 4: Add Review, Execution, and Result UI

1. Build `BulkInstallDialog` with target, review, installing, and result stages.
2. Connect preview data, blocker rendering, and replacement confirmation.
3. Connect the single execution request and grouped result display.
4. Reconcile successful versus retained selections on close.
5. Implement focus entry, focus trap, Escape/backdrop behavior, focus return,
   aria-live updates, mobile layout, and reduced-motion behavior.

### Phase 5: Verify and Document

1. Add interaction tests with a per-file jsdom Vitest environment and mocked
   Server Actions.
2. Run focused tests, the complete suite, build, and lint commands.
3. Complete the manual browser matrix in both themes and responsive widths.
4. Update `README.md` and `PRD.md` after behavior is verified.

## Testing Plan

| Test | File or Command | Purpose |
| ---- | --------------- | ------- |
| Schema unit | `lib/types.test.ts` | Reject empty/duplicate/oversized refs, duplicate tools, and AGENTS.md. |
| Service unit | `lib/skill-installer.test.ts` | Verify planning, exact source, collisions, blockers, replacement confirmation, safe write order, and result aggregation. |
| Action integration | `lib/actions/skills.test.ts` | Verify real temporary-filesystem output for many skills/tools and preserve single-install behavior. |
| Catalog interaction | `app/skills/skills-list.test.tsx` | Verify selection mode, filters, limit, select-visible, dialog flow, confirmation, and result reconciliation. |
| Focused suite | `npm test -- lib/types.test.ts lib/skill-installer.test.ts lib/actions/skills.test.ts app/skills/skills-list.test.tsx` | Fast feedback during implementation. |
| Full regression | `npm test` | Detect regressions across registry, adapters, builds, links, safety, and actions. |
| Production compile | `npm run build` | Verify Next.js server/client boundaries, serialization, strict TypeScript, and route compilation. |
| Lint | `npm run lint` | Verify repository lint rules. |
| Manual browser | `npm run dev` at `/skills` | Verify actual card selection, sticky behavior, modal focus, results, and toasts. |

Manual browser coverage must include:

- 375px, 768px, and desktop widths;
- light and dark themes;
- mouse, keyboard-only, and touch-sized targets;
- All, Toolkit, and Local filter changes with hidden selections;
- zero, one, several, and all-visible selections;
- existing destination replacement confirmation;
- a clean success, preview blocker, runtime partial result, and complete failure;
- Escape/backdrop before installation and blocked dismissal during installation;
- focus return after close and screen-reader announcements for loading/results;
- reduced-motion mode.

## Edge Cases

- **Toolkit/local identity collision:** exact `source` loading installs the card
  the user selected instead of applying toolkit-first fallback.
- **Same install name from different domains:** destination collision blocks the
  preview and names both refs; the user must keep one.
- **Filter hides selected skills:** selection persists and the toolbar reports
  the hidden count. Deselect-all-visible does not clear hidden selections.
- **Registry changes after page load:** install-time exact loading fails before
  writes and reports the missing ref.
- **Destination changes after preview:** the install action rebuilds the plan.
  New blockers or unconfirmed replacements abort the batch before writes.
- **Adapter returns no output:** preview marks the skill/tool pair as blocked.
- **One adapter returns several files:** the pair is installed only when every
  output succeeds; some written files plus an error produce `partial`.
- **Backup failure:** that destination is not overwritten and the pair fails.
- **Marker failure:** the pair succeeds with a warning and tells the user that
  future ownership detection may be degraded.
- **Selection limit:** the 101st selection is rejected client-side and server
  validation independently enforces the same maximum.
- **Repeated install:** every existing destination appears in review, is backed
  up, and is atomically replaced only after confirmation.
- **Dialog closes after partial result:** fully successful refs are removed;
  partial and failed refs remain selected.

## Risks And Mitigations

- **Bulk writes amplify existing overwrite risk.** Mitigation: mandatory server
  preview, conservative treatment of every existing destination, explicit
  confirmation, backup-before-write, atomic writes, and path validation.
- **Preview and execution can observe different filesystem state.** Mitigation:
  rebuild and validate the plan immediately before execution and abort before
  writes if new blockers or unconfirmed replacements appear.
- **A runtime error can leave a partial batch.** Mitigation: deterministic
  sequential execution, per-target structured results, retained failed
  selection, backups, and clear recovery guidance. Transactional rollback is a
  later safety enhancement.
- **Selection mode can break card navigation semantics.** Mitigation: use two
  explicit render modes with one interactive root each; never nest a checkbox
  inside a link or make one click both select and navigate.
- **Large selections can make preview and UI rendering slow.** Mitigation: cap at
  100 skills, return summaries instead of content, use memoized cards, and keep
  detailed preview/result lists in a bounded scroll region.
- **The existing directory marker is not reliable per-file ownership evidence
  for flat rule directories.** Mitigation: bulk replacement confirmation does
  not rely on that marker. A per-output ownership manifest is outside this
  feature.

## Rollout And Rollback

- No database, profile, config, or URL migration is required.
- No feature flag is required for this local-first application. The new actions
  are reachable only through selection mode, and single-skill installation is
  preserved as a regression-tested wrapper.
- Roll out as one additive release after the complete test and manual matrices
  pass.
- Code rollback consists of reverting the new components, service, schemas, and
  actions while restoring the original in-file card. The preserved single-skill
  action prevents route breakage during rollback.
- Reverting the application does not remove skills already installed by a batch.
  Users can remove them from `/my-skills`; backups remain under
  `~/.agent-toolkit-backup/` for manual restoration.

## Non-Goals

- Bulk uninstall.
- Per-skill tool matrices.
- Project-scoped installation from the catalog.
- AGENTS.md bundled output.
- Automatic dependency expansion.
- Saving a selection as a profile.
- Persisting selection across navigation or refresh.
- Streaming per-file progress from the Server Action.
- Transactional rollback of an entire batch.
- Redesigning tool detection or the existing ownership marker format.
- Changing detail-page routes to disambiguate local and toolkit duplicates.

## Implementer Handoff Checklist

- [x] Requirement is unambiguous or assumptions are explicit.
- [x] Files to change are named.
- [x] Component, action, schema, and service responsibilities are defined.
- [x] Preview, validation, backup, atomic-write, and partial-failure behavior are
      explicit.
- [x] Accessibility and responsive behavior are specified.
- [x] Phases are ordered and dependencies are visible.
- [x] Tests and commands are listed.
- [x] Risks, rollout, rollback, compatibility, and non-goals are covered.
