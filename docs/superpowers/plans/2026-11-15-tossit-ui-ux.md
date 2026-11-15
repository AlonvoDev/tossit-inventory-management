# TossIt UI/UX Implementation Plan — Claude

> **For agentic workers:** Use superpowers:executing-plans if available to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. The implementer is Alon's separate Claude session; do not launch additional implementation agents by default.

**Goal:** Make TossIt's inventory and daily actions visibly clearer and easier on a phone while preserving its working permissions, offline queue and server contracts.

**Architecture:** Change the existing React/MUI presentation in three independently reviewable checkpoints. Consume existing auth, inventory and offline interfaces. Codex handles backend/security/dependency changes and final integration; Claude implements the UI in his own branch.

**Tech Stack:** React19, TypeScript, MUI7, existing RTL theme/CSS, Vitest/Testing Library and Playwright. No new design framework or package required.

**Spec:** The Product brief, Acceptance criteria, Ownership and Contract constraints in this document are the approved implementation brief, based on Alon's requested UI/UX round. This plan supersedes presentation ownership in the historical 2026-11-09 plan for this round only. Historical U1–U5 work is complete; do not repeat it.

## Start here — branch and current production facts

- Repository: https://github.com/AlonvoDev/tossit-inventory-management
- Verified starting main/core SHA: `6addce251e9fedf6fa738336cf631ed2f06bad2d`.
- Released application code: `8ac72aa2c81e91e77550f0b3f936b909d26d67ea`; later commits through `6addce2` only document rollout. Main now contains the Neon host and the combined C1–C5/U1–U5 work.
- Claude branch: `claude/tossit-ui`, last observed `357bf15cd03ba728531b3607d9d442945d6e586f`. That old branch was already integrated; do not start a new round from its old tree.
- Codex branch: `codex/tossit-core`; this plan is published there. Merge the exact plan-publication SHA supplied by Alon/Codex into Claude's branch with a normal merge (a fast-forward is fine). That commit includes `6addce2` plus these instructions. If main has newer commits, inspect and coordinate instead of resetting anyone's work.
- Live site: https://tossit-inventory-management.onrender.com/ . Render deploy is manual, Free/Node22. Neon is credential-connected; Firebase Auth/Firestore retained. Push VAPID is absent and its schedule is disabled. Do not announce working push or turn anything on.
- The existing admin profile's email/department repair is complete. No production profile/data cleanup is part of UI work. Two malformed legacy records belong to another business and must not be reassigned or used as UI fixtures.
- Real production sign-in and phone/staff pilot are still unverified. Desktop/emulator results must not be reported as a real-device pilot.

## Product brief

A bartender checking stock during service should immediately see what needs attention, find an item, open a batch and record finished/discarded stock without navigating decorative dashboard sections. A manager should understand scope, quantities and exceptions quickly. The result must look meaningfully improved, not just recolored.

Use the current TossIt artwork, a restrained teal primary color, light neutral surfaces, readable Hebrew typography and consistent spacing. Use the active `src/app/theme.tsx`; do not build a parallel theme. Remove decorative emphasis that competes with stock/actions in touched screens. Avoid gratuitous animation, excessive gradients, giant welcome banners and invented analytics. Keep existing product names, units and authoritative dates intact.

### Acceptance criteria

1. At widths320/390/768/1280px, the main workflow has no page-level horizontal overflow. At390px the inventory title/scope, primary open action and useful filter controls appear before decorative information. Item cards show name, quantity/unit, expiry and explicit status without opening another view.
2. Inventory status is conveyed by Hebrew text plus an icon/color, never color alone. Expired open inventory is visibly different from expiring soon, finished/discarded and queued/failed operations. Sorting/filter membership remains governed by existing domain selectors.
3. Common actions use clearly labeled controls with at least44px touch targets. A long Hebrew name wraps without hiding action buttons. Quantities/dates remain readable in RTL, with an LTR subspan where appropriate.
4. Empty inventory, no filter matches, loading, permission/network error and account-scoped offline data are visibly different states. Errors are never disguised as empty inventory.
5. Opening/closing requires an explicit confirmation; failed submission retains input and retry intent. Pending local changes explicitly say saved on this device/waiting for server. A failed queued change is never shown as synced.
6. Forms fit a phone with the keyboard open, retain accessible labels/inline errors and keep submit/cancel reachable without covering fields. Dialogs trap focus, close appropriately, and restore focus to the initiating control. Navigation, filters and dialogs work by keyboard and at200% zoom.
7. No regression in role/department visibility, shift requirements, duplicate-submit protection, concurrent close behavior, offline persistence, logout/account privacy, one-worker registration or controlled updates.
8. Each checkpoint includes before/after screenshots using synthetic emulator data at390px and1280px, plus written narrow-screen/keyboard findings. A screenshot comparison must show the interaction/hierarchy improvement, not only new colors.

## Ownership and global constraints

| Owner | Allowed work |
| --- | --- |
| Claude | Existing screens/components and their UI tests; `src/app/theme.tsx`, `src/index.css`, `src/App.css`, `src/styles/responsive.css`; presentational helpers under `src/features/presentation/`; visual-only changes to `src/pwa/SyncStatus.tsx`, `OfflineIndicator.tsx`, `PWAPrompt.tsx`, `NotificationControls.tsx` and their tests |
| Codex | `functions/**`, `firestore.rules`, indexes, `src/api/**`, `src/domain/**`, `src/offline/**`, `src/services/**`, auth/context behavior, `src/hooks/useItemActions.ts`, `src/utils/notificationUtils.ts`, expiry/business-policy helpers, packages/lockfiles/config/CI, Render/Neon/Firebase secrets/deployments |
| Protected this round | `src/pwa/service-worker.ts`, `swHandlers.ts`, `swLogic.ts`, `updateStore.ts`, `src/app/main.tsx` provider/worker setup, Vite/PWA/build configuration. Ownership from the old round does not authorize modifying these now. |

- Existing UI-selection/form helpers in `src/features/inventory/**` are read-only for semantics. Request a Codex change if an inconsistency requires changing a threshold, validation rule, selector or write behavior. Do not quietly duplicate business logic in a new UI helper.
- Preserve exported component props, route paths and current action/API payloads. Extract small presentational components if useful, but do not restructure the whole app or delete unrelated showcase/demo files.
- Keep React/MUI, Hebrew/RTL and existing artwork. No Tailwind, canvas-based UI, new dependencies or generated logo replacement.
- Never edit another agent's handoff. Claude writes `docs/handoff/claude.md`; requests go in `docs/CLAUDE_REQUESTS.md`. Codex writes `docs/handoff/codex.md`. Newest entries must clearly supersede historical requests.
- Do not edit packages/lockfiles to quiet warnings or apply `npm audit fix`. Codex owns the dependency audit, including currently outstanding critical transitive findings.
- Develop with synthetic local emulators only. Plain `npm run dev` connects to live Firebase unless explicitly configured; read README/RELEASE before running. Do not create production users, inventory, roles or sample records for screenshots.
- Do not merge/push main, deploy, enable billing/schedules/push, alter secrets or call production write APIs. Push only the Claude branch. Alon's prior rollout approval was for the released candidate, not automatic deployment of this redesign.
- No force-push, reset of shared history, blanket `git add .`, or overwrite of uncommitted work. Preserve existing tests. Cosmetic changes need visual verification; new interaction behavior needs focused meaningful tests.

## Contract constraints — use existing interfaces

- `OpenItemForm` in `src/components/OpenItemForm.tsx`: preserve `department: Department`, `onItemAdded?: (receipt: WriteReceipt) => void`, `disabled?: boolean`.
- `ItemsList` in `src/components/ItemsList.tsx`: preserve existing department/mode flags, `isOffline`, `onItemUpdated` and compatibility `refreshTrigger` prop. Continue consuming `selectItems(items, opts, nowMs)` from `src/features/inventory/itemSelection.ts` for mode membership and expiry ordering.
- Selection currently treats expiring as future expiry within three 24-hour days; expired is expiry<=now and still open. Do not change these boundaries or label every item within24hours as a new stored status. Reuse existing display utilities; flag inconsistent boundary behavior for Codex.
- `ItemActionModal` in `src/components/ui/ItemActionModal.tsx`: retain `ItemActionConfirm` (`action: 'finished' | 'discarded'`, optional `discardedAmount`, `reason`) and existing loading/error/closedElsewhere props.
- Preserve the `useCloseItem()` flow and operation IDs. Existing `src/features/inventory/openItem.ts` and `closeItem.ts` own quantity parsing/validation. Do not add direct Firestore calls or reconstruct actor/business/expiry in JSX.
- Offline state comes from existing `useOffline()`; keep pending/failed counts separate from connection state. `SyncStatus` continues accepting `itemNames?: Record<string,string>` and retrying the same operation.
- Role/scope is consumed through current auth/access interfaces, never inferred from UI labels. Hiding an action is presentation; server/rules authority remains unchanged.

## Review focus

| Condition | Expected behavior | Owning checkpoint |
| --- | --- | --- |
| Long Hebrew name, decimal kg and no fridge | Name wraps; unit/amount clear; no clipped actions or invented fridge | UI1 |
| Zero records vs filters with zero matches vs permission error | Distinct messaging and recovery controls | UI1 |
| Local pending and failed operations alongside expired items | Both expiry and sync state remain visible; no false server success | UI1/UI2 |
| Slow double tap, failed request, lost acknowledgement or another device closes first | One intent, retained input/retry, truthful closed-elsewhere state | UI2 |
| Staff off shift, narrow keyboard viewport, logout with pending work | Correct restrictions, accessible focus/submit and existing privacy warning | UI2/UI3 |

## Checkpoint UI1 — inventory hierarchy and visual foundation

**Modify:** `src/pages/Dashboard.tsx`, `src/components/ItemsList.tsx`, `src/components/DashboardKPIs.tsx` only if rendered, `src/app/theme.tsx`, relevant owned CSS.
**May create:** `src/components/inventory/InventoryItemCard.tsx` and `src/components/inventory/InventoryItemCard.test.tsx` for rendering an already-derived view; do not add business calculations here.
**Tests:** `src/pages/Dashboard.test.tsx`, `src/components/ItemsList.test.tsx` and any new card test.
**Consumes:** existing list props/selectors, auth role/scope, fridge/catalog reads, offline operations. **Produces:** the same dashboard/list exports and interactions with clearer inventory-first hierarchy; shared theme tokens reused by UI2/UI3.

- [ ] Fetch/check the starting SHA and clean worktree, merge the published plan checkpoint into `claude/tossit-ui`, and record the starting HEAD in Claude's handoff. Run baseline `npm run test:run`, `npm run build`, `npm run lint` once; distinguish baseline failures/warnings from changes.
- [ ] Capture current390/1280px dashboard/inventory screenshots from emulators. Record the specific hierarchy/interaction problems being fixed and a short proposed screen layout in `docs/handoff/claude.md`. Implement the agreed brief without another general planning/approval loop; ask only for a material product ambiguity that cannot be resolved from it.
- [ ] Add focused tests where behavior changes: `keeps expiry and failed-sync labels visible together`, `distinguishes empty scope from no search matches`, `keeps permission errors visible`, `preserves staff department restrictions`. Run the changed test files first and confirm each intended new assertion fails for the current behavior before implementing it. Do not write failing pixel/token snapshots for cosmetic changes.
- [ ] Implement the dashboard/list layout and theme consistency. Make open-item action prominent, preserve all existing modes/search/fridge filtering, and reduce decorative dashboard height. Keep loading/error/empty states and role controls explicit.
- [ ] Run targeted tests, then the checkpoint checks below. Inspect actual390/1280px screens plus320/768px and200% zoom. Check long names, decimal amounts, absent fridge, many items, pending/failed labels and keyboard navigation. Capture after screenshots with synthetic data.
- [ ] Review diff against ownership/contracts, update handoff with UI1 evidence, commit `feat(ui): improve inventory hierarchy and mobile readability`, push `claude/tossit-ui`, verify the remote SHA and mark **UI1 READY** only if checks pass.

## Checkpoint UI2 — fast, truthful opening and closing

**Modify:** `src/components/OpenItemForm.tsx`, `src/components/ui/ItemActionModal.tsx`, relevant owned `src/components/ui/` controls, presentation-only `src/pwa/SyncStatus.tsx` / `OfflineIndicator.tsx` if needed.
**Tests:** `src/components/OpenItemForm.test.tsx`, `src/components/ItemsList.test.tsx`, `src/pwa/SyncStatus.test.tsx`, `src/pwa/OfflineIndicator.test.tsx`; add `src/components/ui/ItemActionModal.test.tsx` if isolated focus/validation tests are missing.
**Consumes:** unchanged UI1 theme plus form/modal/receipt/offline contracts above. **Produces:** same exported APIs, faster phone interaction and accessible, truthful feedback.

- [ ] Preserve existing regression tests; add only missing coverage or tests of newly changed interactions: `retains values and retry intent after failure`, `prevents repeated submit while pending`, `shows local receipt as waiting for server`, `keeps failed operation distinct from disconnected state`, `restores dialog focus`, `blocks staff actions off shift`. Preserve existing concurrent-close assertions rather than replacing them with screenshots.
- [ ] Run targeted tests and inspect expected failures for new behavior, then implement only the presentation/interaction changes. Keep product-derived units/expiry, positive decimal kg/integer units, discard reasons and quantities, errors and same-ID retry semantics.
- [ ] Inspect a390px phone viewport with the keyboard space constrained: focused field, inline error, submit/cancel and sync notice must remain reachable. Test keyboard tab order, Escape/focus restoration, slow request, offline receipt, failed receipt and closed-elsewhere state using synthetic fixtures/emulators.
- [ ] Run checkpoint checks, capture before/after interaction screenshots, document UI2, commit `feat(ui): streamline mobile inventory actions`, push and verify SHA. Mark **UI2 READY** only when its checks pass. Continue UI3 from this branch; no need to wait for a Codex merge if no interface request is outstanding.

## Checkpoint UI3 — navigation, admin screens and final visual review

**Modify:** `src/components/UnifiedNavigation.tsx`, `src/pages/AdminPanel.tsx`, `src/pages/AdminUsersPage.tsx`, `src/pages/AdminFridgesPage.tsx`, `src/components/ProductManagement.tsx`, `src/components/DiscardReport.tsx`, `src/pages/LoginPage.tsx`, and `src/features/settings/SettingsPage.tsx`. Presentation-only PWA dialogs may reuse the theme without changing their lifecycle.
**Tests:** existing adjacent navigation/admin/product/report tests; add focused tests beside any changed interactive control.
**Consumes:** UI1/UI2 theme/components and all unchanged role/action/server contracts. **Produces:** consistent remaining screens, no placeholder controls and a complete reviewable UI candidate.

- [ ] Review current route/component imports first; change only active screens, not unused alternative dashboards/themes. Inventory remains the primary workflow.
- [ ] Add tests for changed navigation/form behavior: role-appropriate menu entries and focus; logout still warns with pending work; admin cannot self-demote/deactivate through UI; offline admin forms remain disabled with an explanation. Keep deactivation copy distinct from permanent deletion and never add reactivation without a server contract.
- [ ] Apply consistent headings, spacing, tables/cards, action placement and Hebrew states. Preserve settings/report semantics and no-VAPID notifications-unavailable state; do not display optimistic enabled notifications.
- [ ] Run checkpoint checks and full existing browser suite with emulators. Review admin and staff screenshots at390/1280px, keyboard/zoom, long/error/empty states and dynamic menus. Record untested iPhone/Android behavior as NOT RUN.
- [ ] Document remaining issues, requests and exact commands/results; commit `feat(ui): unify navigation and management screens`, push and verify SHA. Mark **UI3 READY FOR CODEX REVIEW**; do not deploy or merge main.

## Checkpoint checks and efficient execution

- Targeted examples: `npx vitest run src/components/ItemsList.test.tsx src/pages/Dashboard.test.tsx` (UI1); `npx vitest run src/components/OpenItemForm.test.tsx src/components/ItemsList.test.tsx src/pwa/SyncStatus.test.tsx` (UI2). Include any newly created tests in the relevant command.
- Every READY checkpoint: `npm run test:run`, `npm run build`, `npm run lint`. Known last baseline:304 client tests, build PASS, lint0errors/7existing Fast Refresh warnings; counts may increase. Do not claim a baseline warning is newly fixed unless verified.
- Run `npm run test:browser` at UI1, UI2 and final UI3 because layout changes affect routing/action flows. Follow README prerequisites: root/functions lockfiles, Node22, Java21 and supported Chromium. This command uses demo Auth/Firestore and the host adapter. If the browser/runtime cannot run, report the exact blocker and mark that verification NOT RUN; do not call it PASS or remove the test.
- Avoid re-running server/rules suites for pure style changes unless a regression or integration boundary warrants it. Do not change another owner's file just to make a UI mock pass.
- Keep each checkpoint bounded. Before context/token exhaustion, commit/push a coherent subcheckpoint with explicit IN PROGRESS/NOT READY status and outstanding failures. Never leave the only copy of completed work local. No secrets, real-data screenshots or emulator exports in git.
- Verify publication: `git rev-parse HEAD` must match `git ls-remote origin refs/heads/claude/tossit-ui`. Handoff includes exact SHA, touched paths, commands/results, screenshot paths, known issues and READY/IN PROGRESS state. A local commit is not a completed checkpoint.

## Coordination with Codex

Codex's parallel lane: audit/update vulnerable dependencies with appropriate regression checks; validate secure backend/sync behavior; prepare VAPID/provider-delivery/push pilot separately; review Claude checkpoints and integrate pinned SHAs. No new server/account mutations are authorized by this UI plan. Codex will not edit Claude's presentation files concurrently without coordination.

If blocked on a contract or semantic inconsistency, add a numbered request in `docs/CLAUDE_REQUESTS.md` with path, current behavior, requested interface and a concrete example. Continue an independent owned screen while awaiting the response; do not work around it with a UI permission fallback, fake success or business-rule duplication.

Codex merges only a published READY checkpoint after reviewing the diff and combined checks. Existing Claude U5 requests are historical/resolved unless explicitly reopened. Final deployment requires the new integrated UI candidate to be reviewed and authorized; keep manual deployment and the disabled schedule unchanged during development.
