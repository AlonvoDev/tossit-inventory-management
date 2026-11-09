# TossIt Two-Agent Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task when that skill is available. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure, reliable bar/kitchen inventory PWA suitable for a small real pilot and a portfolio demonstration.
**Architecture:** Keep React, TypeScript, MUI, Firebase Auth and Firestore. Codex owns identity, domain operations, security, persistence and server delivery; Claude owns presentation, navigation and the single PWA service worker. Explicit contracts and staged merges allow independent implementation without parallel edits to shared files.
**Tech Stack:** Existing stack; Firebase Admin/Functions for privileged operations and scheduling, standard Web Push, IndexedDB for the application operation queue.
**Spec:** The Scope, Product Rules, Contracts and Acceptance sections of this document are the proposed delivery specification.
**Status:** Planning and branch setup only. No feature implementation is included in this planning commit.
**Verified base:** `9948d34bc9785b4aeed8eb6ffe9311621a727c9f` on `main`, verified 2026-11-09.
**Repository:** https://github.com/AlonvoDev/tossit-inventory-management

## Scope

Finish the existing product rather than rebuild it. Preserve products, categories, fridges, staff management, finished/discarded actions and the discard report. Complete identity, authorization, expiry, shift persistence, offline reliability, scheduled notifications, essential settings and mobile usability.

Exclude payments, WhatsApp, Google Sheets, new advanced report types, a new visual framework, unrelated redesigns and additional product features. Remove or clearly mark inactive report options instead of presenting placeholders as working features.

Planning assumptions for review: admin manages the business; manager manages their assigned department; staff operate inventory in their assigned department during an active shift. Existing manager profiles must be inspected before enforcing department restrictions. Public signup cannot select an existing business or privileged role.

## Global Constraints

- Two implementers: Codex and the user's separate Claude session. Do not claim Claude is running until that session is actually started.
- Codex branch: `codex/tossit-core`. Claude branch: `claude/tossit-ui`.
- Both start from the same published planning commit. No direct commits or merges to `main` during implementation.
- Each task or bounded subtask ends with a reviewed diff, checks, commit, successful push and remote-SHA verification.
- Never force-push, delete another worker's commits, reset shared history or use `git add .`.
- Never deploy functions, rules, migrations or the production app during implementation. Document deployment steps and test with emulators.
- Never enable billing, send staff invitations, create production accounts or change live roles as a side effect of tests.
- Do not put credentials, service-account files, VAPID private keys, tokens, real staff records or emulator exports containing private data in Git.
- Preserve backward-compatible API exports while existing consumers are being migrated. No fake-success fallbacks.
- Default business timezone is `Asia/Jerusalem`; never use the browser's timezone for scheduled business actions.
- UI copy is Hebrew; canonical stored department values are `bar` and `kitchen`.
- Keep dependency changes small. Codex alone owns root package/config/lockfile changes except Claude-owned Vite/PWA files.
- Production deployment and a real-device pilot remain explicit release tasks. Code completion is not production verification.
- Root build baseline passes; five Button tests pass; lint baseline is four errors and seven warnings. Do not attribute those existing issues to new work.

## Review Focus

1. A permission-denied write must produce an error, never a fake item or an empty-success result.
2. Reloading offline and signing into a different account must not lose, submit or expose another user's queued operations.
3. Concurrent finished/discarded actions must resolve to one terminal state and keep a visible explanation for a rejected operation.
4. Stale cached catalogs, decimal weights and legacy Hebrew department values must not create incorrect expiry or hide existing inventory.
5. A closed app, DST change, retried scheduler invocation and multiple devices must not cause wrong recipients or duplicate notification slots.

Each owning task below includes tests for these conditions.

## Approaches considered

1. **Recommended: domain/platform vs UI/PWA.** Codex implements the cross-cutting consistency and security work; Claude implements focused screens and interaction tests. File ownership is mostly disjoint. Shared API checkpoints are required.
2. **Feature split, such as inventory vs admin.** Initially parallel but both workers repeatedly edit Auth, item APIs, routing and shared models, increasing conflicts and duplicate debugging.
3. **Sequential full-stack tasks.** Simplest merging, but leaves one implementer waiting and underuses the available sessions.

We use approach 1 as the proposed allocation. This is a collaboration decision for this project, not a claim about universal model capability.

## File ownership

| Owner | Exclusive paths |
| --- | --- |
| Codex | `src/api/**`, `src/services/**`, `src/types/**` except `src/types/pwa.d.ts`, `src/context/AuthContext.tsx`, `src/context/ShiftContext.tsx`, `src/hooks/useAuth.ts`, `src/hooks/useNotifications.ts`, `src/utils/expiryUtils.ts`, `src/utils/syncManager.ts`, `src/utils/notificationUtils.ts` |
| Codex | New `src/domain/**`, `src/offline/**`, `src/test/domain/**`, `src/test/rules/**`, `functions/**`; `firestore.rules`, `firestore.indexes.json`, `firebase.json`, root package/lock/test/TypeScript/ESLint config, `.github/**`, `.gitignore` |
| Claude | `src/app/**`, `src/pages/**`, `src/components/**`, `src/features/**`, `src/context/NotificationContext.tsx`, `src/hooks/useItemActions.ts` |
| Claude | `src/pwa/**`, `src/service-worker.ts`, `src/types/pwa.d.ts`, `public/**`, `src/assets/**`, `src/styles/**`, `src/App.css`, `src/index.css`, theme files, `src/main.tsx`, `index.html`, `vite.config.ts` |
| Codex | This plan, `docs/handoff/codex.md`, `docs/RELEASE.md` |
| Claude | `docs/handoff/claude.md`, `docs/PILOT.md`, `docs/CLAUDE_REQUESTS.md`, root `README.md` |

Tests colocated with Claude-owned components belong to Claude. Codex may add `src/test/setup.domain.ts` to avoid reusing the broad Firebase mocks in the current UI setup.

Neither worker edits the other owner's files to make a build pass. Put a specific request in the owner-specific handoff and push it. Codex handles shared integration requests in bounded commits.

## Product rules and shared contracts

### Identity and permissions

- Preserve `admin | manager | staff` and `bar | kitchen`.
- One authoritative AuthContext. `src/hooks/useAuth.ts` becomes a compatibility facade over it, not another Firebase observer.
- Preserve current aliases: `user/currentUser`, `profile/userProfile`, `loading/isLoading`, `uid/userId`, `businessId`, role flags and `logout`.
- Export `AuthContextType`/`UseAuthReturn` consistently; include `isOnShift`, `shiftStartedAt` and `profileNotFound`.
- Missing, disabled or unauthorized profiles grant no app access. Clear previous profile immediately when Firebase UID changes.
- Admin provisioning uses an authenticated callable backend with verified business-admin authorization. Use an idempotency request ID; handle Auth-created/profile-write failure without duplicating accounts or changing the caller's session.
- Deactivate employees through a documented server-authorized path. Existing delete-profile behavior must not be presented as deleting the Auth account.
- Rules protect business, role and department fields against self-edit. Staff may update their own shift through a narrow allowed-field path.
- Manager restrictions must be enforced in rules/callables as well as route and menu visibility.
- Existing data normalization is read-compatible. No destructive live migration.

### Domain contracts to be published by Codex in C2

Create `src/domain/contracts.ts` exporting these types, and `src/api/inventoryOperations.ts` implementing the operations:

```ts
export type Department = 'bar' | 'kitchen';
export type ItemUnit = 'kg' | 'units';
export type DiscardReason = 'expired' | 'damaged' | 'other';
export type SyncState = 'pending' | 'synced' | 'failed';

export interface OpenInventoryItemInput {
  operationId: string;
  productId: string;
  amount: number;
  fridgeId?: string;
  openedAtMs: number;
}
export interface CloseInventoryItemInput {
  operationId: string;
  itemId: string;
  action: 'finished' | 'discarded';
  discardedAmount?: number;
  reason?: DiscardReason;
}
export interface WriteReceipt {
  operationId: string;
  itemId: string;
  state: 'pending' | 'synced';
}
export interface SyncOperation {
  operationId: string;
  itemId: string;
  state: SyncState;
  errorCode?: string;
}
export interface BusinessSettings {
  timezone: 'Asia/Jerusalem';
  eveningRemindersEnabled: boolean;
  morningSummaryEnabled: boolean;
  autoEndShiftsAtMidnight: boolean;
}
export interface PushPayload {
  version: 1;
  title: string;
  body: string;
  url: string;
  tag: string;
}
```

Exact exports:

```ts
// src/api/inventoryOperations.ts
openInventoryItem(input: OpenInventoryItemInput): Promise<WriteReceipt>
closeInventoryItem(input: CloseInventoryItemInput): Promise<WriteReceipt>
subscribeSyncOperations(listener: (ops: SyncOperation[]) => void): () => void

// src/api/settingsAPI.ts
getBusinessSettings(): Promise<BusinessSettings>
saveBusinessSettings(input: BusinessSettings): Promise<void>

// src/utils/notificationUtils.ts
enablePushNotifications(): Promise<'enabled' | 'denied' | 'unsupported'>
disablePushNotifications(): Promise<void>
```

Contract rules:
- Current identity supplies user/business/department. UI does not supply a trusted role, businessId or actor name for these operations.
- Caller generates one UUID per user action and reuses it for retry. Codex persists the payload before returning `pending`.
- Open operation uses catalog name, unit, department, shelf life and product identity. Persist the captured catalog values and actual opening instant; never reset expiry to the reconnect time.
- Product config changing before offline replay produces an explicit `catalog-changed` conflict retained for review; it must not silently extend expiry.
- Positive finite decimal kg amounts are allowed; units are positive integers. Discarded amount cannot exceed the item's amount.
- This release closes the tracked item as a whole. discardedAmount records the waste portion; it does not leave a partially active batch. Partial batch accounting is out of scope.
- Both terminal actions are mutually exclusive. Retry of the same operation is idempotent; a different terminal operation returns `already-closed`.
- Normalized items remain readable through existing `Item` exports; preserve legacy `isThrown/discarded/finished` compatibility during transition.
- Rejections use `Error` objects with string `code`: `unauthenticated`, `permission-denied`, `invalid-input`, `not-on-shift`, `not-found`, `already-closed`, `catalog-changed`, `unavailable`.
- UI shows pending, synced and failed separately. Permission errors never become offline success.
- `subscribeSyncOperations` only exposes the signed-in user's current-business operations; it unsubscribes safely on session change.

### Offline and server boundaries

Use one durable IndexedDB operation queue with serialized timestamps and stable operation/document IDs. No second queue in the form, API or service worker. Serialize replay, prevent concurrent-tab double processing, retain failed operations and reconcile optimistic state with the server.

Bootstrap listeners and queue lifecycle in a Codex-owned provider inside `src/offline/OfflineProvider.tsx`; Claude mounts it once in app/main after C3. Before C3, retain existing behavior only as explicitly transitional and do not claim offline acceptance.

Callable functions use Firebase Admin and validate every actor/business/role. Inventory clients may use direct Firestore writes only where rules fully enforce the invariant; C2 documents any new collection and rules. The transaction that resolves competing closes is authoritative. Test with emulators, not production.

### Notifications and PWA

- Codex owns notification subscription storage and sending; Claude owns the service-worker implementation and notification controls.
- Single worker built with vite-plugin-pwa `injectManifest` from `src/pwa/service-worker.ts`. One root scope, one registration through the existing app bootstrap. Remove unused worker registrations only in Claude-owned paths; request removals in Codex paths.
- Worker consumes `PushPayload`, uses `registration.showNotification`, and opens only same-origin application paths.
- `enablePushNotifications` uses the existing active worker via `navigator.serviceWorker.ready`; it never registers another worker and is called only by an explicit UI action.
- Subscription is device-specific and bound to authenticated UID/business; revoke/detach it on logout or disable.
- Initial fixed slots: 23:00, 23:20, 23:40 reminders to active staff in the relevant department while expired active items remain; 08:00 summary of overdue unhandled items to active admin/manager in scope.
- Optional midnight auto-end defaults to false. Other reminder toggles default true. A missing settings document reads these defaults.
- Firebase scheduled functions evaluate business timezone, use persistent slot/recipient deduplication and prune invalid push endpoints. Keep retries recoverable without claiming guaranteed exactly-once external delivery.
- Firebase Functions/Cloud Scheduler may require billing-enabled project configuration. Implement/test locally and document the release prerequisite; never activate billing or deploy automatically.

## Git and recovery protocol

### Bootstrap

1. Codex creates `codex/tossit-core` from the verified main SHA.
2. Publish this plan as a planning-only commit (P0).
3. Create `claude/tossit-ui` from P0. Both workers now share identical rules and contracts before feature work.
4. Each worker uses its own clone/worktree and branch; do not switch a shared working directory underneath another process.
5. Claude starts only when the user opens their Claude session and supplies the handoff prompt below.

### Before every task

```bash
git status --short
git branch --show-current
git fetch origin
git log -3 --oneline
```

Verify correct branch and no unknown local changes. Read only this plan, the relevant task, the other worker's latest handoff when a dependency changed, and the owned files needed for this task. Fetch does not merge.

### Finishing each task or bounded subtask

- [ ] Review `git diff --check` and the diff; stage explicit owned paths.
- [ ] Run the task's tests, `npm run build`, `npm run test:run`; run lint and record its exact result.
- [ ] Update only your own `docs/handoff/<agent>.md` with task ID, changed files, commands/results, remaining failures, dependency requests and next action.
- [ ] Commit with task ID, e.g. `fix(C2): derive inventory expiry from product configuration`.
- [ ] Push only your branch, e.g. `git push origin HEAD:codex/tossit-core`.
- [ ] Verify `git ls-remote origin refs/heads/<branch>` equals `git rev-parse HEAD`.
- [ ] Report task ID, commit SHA, push result, checks and next task. A local commit alone is not completion.

If the session budget is running low: finish a smaller coherent subtask, update the handoff, commit and push. If unfinished code cannot pass, use an explicitly labeled `wip(<task>)` checkpoint with exact failing commands and a resumption note. Never call it completed, never merge it and never leave the only copy unpushed. Do not try to create a WIP at the moment of token exhaustion; checkpoint earlier.

The handoff records the previously confirmed SHA; the current handoff commit's SHA is read from Git after committing, avoiding a self-referential hash.

### Integration

Codex is the integration owner. At each agreed gate, first verify the other branch's handoff says the relevant task passed and confirm its remote SHA.

- Codex may merge `origin/claude/tossit-ui` into `codex/tossit-core` at completed gates, run checks, record the integrated SHA and push.
- Claude merges a reviewed Codex gate into `claude/tossit-ui` with a normal merge commit. No rebase/force push.
- Neither worker merges a moving or WIP tip. Pin the completed SHA in the handoff and merge that SHA.
- Review a merge conflict against the contracts; don't blindly select ours/theirs.
- `main` stays unchanged until an integrated release candidate is reviewed. A pushed checkpoint is not a deployment.
- If Git push is unavailable, state the exact blocker immediately and stop starting new tasks until remote persistence works.

## Tasks — Codex

Every task may be split into 30–90 minute bounded subtasks if it would otherwise outgrow a session. Each split preserves the finish/push protocol.

### C1 — Authoritative identity and enforceable permissions
**Files:** Modify AuthContext, ShiftContext, hooks/useAuth, api/authAPI, services/firebase, firestore.rules, firebase.json, package files; create `functions/src/users.ts`, `functions/src/index.ts`, `functions/package.json`, `functions/tsconfig.json`, `src/test/rules/authorization.test.ts`, `src/test/domain/auth.test.ts`, and Codex handoff.
**Consumes:** Existing UserProfile and admin APIs.
**Produces:** The identity aliases above; safe admin provisioning/deactivation; compatible existing authAPI exports.
- [x] Add failing tests for signed-out/cross-business access, self-promotion, manager scope, UID change and shift restoration.
- [x] Add callable tests for duplicate create requests, unauthorized caller and profile-write failure cleanup.
- [x] Run tests to demonstrate the current failures.
- [x] Implement authoritative identity, active-profile checks, restricted rules and backend admin operations. Remove default-admin/fake-profile fallbacks. Keep current API signatures while routing privileged operations safely.
- [x] Run rule tests via emulators, targeted auth/callable tests, build and existing tests; record missing deployment setup separately.
- [x] Publish C1 checkpoint and handoff. Claude may consume the stable identity contract.
**Acceptance:** No browser-controlled role grants, no admin-session replacement, refresh preserves shift and identity; neither missing nor disabled profile authorizes access.

### C2 — Correct online inventory and stable UI contracts
**Files:** Create contracts.ts, api/inventoryOperations.ts, api/settingsAPI.ts, domain/inventory.ts, domain/normalizeItem.ts; modify api/firestoreAPI/productsAPI/fridgesAPI/categoriesAPI, models, expiryUtils and rules as needed; add domain/inventory.test.ts and domain/settings.test.ts under src/test.
**Consumes:** C1 identity; existing product/fridge catalog.
**Produces:** Exact operation/settings signatures above, normalized legacy Item compatibility, truthful receipts and realtime reads.
- [x] Write failing cases: shelf lives 1 and 7 days; 0.5 kg accepted; fractional units rejected; NaN/Infinity rejected; foreign fridge/product rejected; permission denied throws; legacy Hebrew areas remain visible; competing closes cannot both win.
- [x] Run tests before implementation.
- [x] Implement catalog-derived expiry and unit, productId persistence, actor derivation, server-authoritative closing, scoped realtime reads and essential settings. Preserve adapters for existing UI calls.
- [x] At this gate online calls return synced after acknowledgement. Offline calls reject unavailable until C3; never invent pending success before durable queuing exists.
- [x] Run targeted tests, emulator invariants, build and all tests; publish C2 contract checkpoint.
**Acceptance:** Claude can integrate U2/U3 against real exported types. C2 handoff lists exact new fields and deployment-neutral migration notes.

### C3 — Durable offline operations and lifecycle
**Files:** Create offline/queueStore.ts, offline/replay.ts, offline/OfflineProvider.tsx; modify inventoryOperations, syncManager and services/firebase only as needed; add src/test/domain/offline.test.ts.
**Consumes:** C2 operation contract.
**Produces:** Durable pending receipts, operation subscriptions, account-scoped cache/queue, replay lifecycle.
- [x] Write failing tests for reload offline, replay retry, two tabs, two accounts on one device, corrupt legacy payload, stale catalog and a competing terminal action.
- [x] Verify failures, implement one queue and deterministic IDs, transactionally resolve writes, retain/reveal conflicts and keep original openedAt/expiry.
- [x] Document recovery/import behavior for existing pendingOperations; never silently discard legacy queued data.
- [x] Test network restoration and restarting replay during an incomplete operation. Verify one persisted item and one terminal action.
- [x] Build/test and publish C3; request Claude's provider mount and deletion of Dashboard's queue clearing.
**Acceptance:** No lost operations, no cross-account replay, no duplicate inventory documents from retry. Logout isolates data without silently destroying pending work.

### C4 — Server scheduling and device subscriptions
**Files:** Create functions/src/notifications.ts, functions/src/scheduler.ts and function tests; modify notificationUtils, discardScheduler, expirationChecker, hooks/useNotifications, settings APIs and rules; update docs/RELEASE.md.
**Consumes:** C1 security, C2 settings, PushPayload contract and Claude's U4 worker.
**Produces:** enable/disablePushNotifications; callable subscription validation; reminder/summary jobs with timezone and deduplication.
- [ ] Test 23:00/23:20/23:40 and 08:00 slots, DST transition, disabled settings, completed items, department filtering, duplicate scheduler requests and invalid endpoints.
- [ ] Test per-device subscribe/logout/disable and worker-ready flow without a second registration.
- [ ] Implement scheduled functions and durable delivery bookkeeping; remove browser timers as the authoritative scheduler.
- [ ] Test sender with a stub transport and server logic with emulators. Record which real push/device tests remain release-blocked.
- [ ] Build client/functions, run tests, publish C4 and the exact deployment prerequisites.
**Acceptance:** Closed-app delivery has a real server path. Tests establish selection/deduplication; real-device delivery is not claimed without a live test.

### C5 — Integrated release candidate, checks and recovery
**Files:** Codex-owned CI/test configs, docs/RELEASE.md, own handoff; merge reviewed Claude gates.
**Consumes:** C1–C4 and U1–U4 completed checkpoints.
**Produces:** Integrated candidate on codex/tossit-core, reproducible checks, release checklist.
- [ ] Add CI for build, unit/integration and rules checks; keep secrets out.
- [ ] Resolve remaining owner-specific lint errors and record any warnings.
- [ ] Merge pinned Claude checkpoints, verify no placeholders are represented as functioning features, run the complete check set.
- [ ] Review cross-worker boundaries: profile/route authorization, receipts/notifications, logout/push/queue, worker registration and item terminal states.
- [ ] Push and publish candidate SHA plus release instructions. Coordinate U5 findings and fix each issue in an owner-scoped commit.
**Acceptance:** Clean build and zero lint errors; meaningful domain/rules tests plus UI tests pass; release blockers explicitly listed.

## Tasks — Claude

### U1 — Consistent access, menus and user-facing states
**Files:** app/routes.tsx, app/App.tsx, components/UnifiedNavigation.tsx, pages/LoginPage/RegisterPage/NotAuthorized, relevant UI tests and own handoff.
**Consumes:** Existing auth exports initially; C1 identity aliases at integration.
**Produces:** Route/menu behavior matching the permission matrix, clear login/loading/unauthorized views, no privileged public signup.
- [ ] Test staff/manager/admin route and menu combinations; missing/disabled profile cannot access a protected screen; loading never briefly exposes admin content.
- [ ] Remove admin/business self-enrollment from public signup. Show a clear business-controlled onboarding message rather than fabricate an invitation flow.
- [ ] Use one auth hook facade; do not add auth observers, profile fallbacks or client privilege writes.
- [ ] Preserve current branding and make copy consistently Hebrew. No redesign of unrelated screens.
- [ ] Run targeted component tests/build/all tests and publish U1.
**Acceptance:** Each visible action matches accessible routes and the documented role scope.

### U2 — Inventory, shift and action flows
**Files:** pages/Dashboard.tsx, components/OpenItemForm/ItemsList/ShiftButton, hooks/useItemActions, components/ui/ItemActionModal, inventory-related components and tests.
**Consumes:** C2 exact inventory contract; C3 operation states/provider when published.
**Produces:** Correct forms, usable finished/discarded workflow, pending/error/conflict presentation and live list behavior.
- [ ] Test decimal kg vs integer units, fridge/department selection, blocked off-shift opening, repeated submit, permission error and distinct pending/synced/failed messages.
- [ ] Integrate operation inputs without trusting UI actor/business/role. Generate/reuse a UUID per intent.
- [ ] Remove Dashboard pendingOperations/cache deletion. Do not introduce another queue.
- [ ] Keep finished and discarded separate; enforce reason/amount UI rules; show a rejected concurrent action without optimistic false success.
- [ ] After C3 merge, mount OfflineProvider exactly once and test pending state across UI remount and account change.
- [ ] Run tests/build and publish U2 in bounded checkpoints.
**Acceptance:** Success messages correspond to synced receipts; pending is visibly pending and retries reuse the original operation ID.

### U3 — Admin, existing reports and essential settings
**Files:** pages/AdminPanel/AdminUsersPage/AdminFridgesPage, components/ProductManagement/DiscardReport/DateRangePicker, features/reports/ReportsPage, features/settings/SettingsPage and related tests.
**Consumes:** C1 admin APIs, C2 settings/catalog APIs.
**Produces:** Existing admin features integrated with safe APIs; working discard report and real settings persistence.
- [ ] Test create/edit/deactivate employee semantics without claiming profile deletion removes an Auth account.
- [ ] Test product/fridge/category validation, manager scope and errors; retain existing functionality.
- [ ] Connect settings save/load; show persisted success and recoverable errors. Do not present console.log as a save.
- [ ] Verify date/reason filters on the existing discard report; hide unfinished inventory/expiry report choices for this release.
- [ ] Preserve existing UI conventions; use focused component extraction only where needed for a tested change.
- [ ] Run tests/build and publish U3.
**Acceptance:** No advertised button is a placeholder, no duplicate business logic in forms and no privileged direct writes.

### U4 — One service worker and mobile PWA
**Files:** app/main.tsx, vite.config.ts, pwa/service-worker.ts, pwa/PWAPrompt/OfflineIndicator, types/pwa.d.ts, public worker/manifest assets, index.html, service-worker.ts and PWA UI tests.
**Consumes:** C4 notification helper signatures, PushPayload contract.
**Produces:** A single injectManifest worker with app-shell caching, same-origin notification navigation, explicit notification opt-in and controlled updates.
- [ ] Test unsupported/denied/granted permission views; don't request permission on page load or pretend unsupported delivery is enabled.
- [ ] Add worker tests for valid/malformed PushPayload, same-origin URL enforcement, missing assets and update behavior.
- [ ] Remove stale/duplicate registrations in owned paths; request Codex changes elsewhere. Cache public app assets, not other users' private API responses.
- [ ] Show queue/data connectivity separately from simple navigator.onLine. Updates must not erase pending operations.
- [ ] Optimize oversized branding images without visual redesign; verify source/manifest paths.
- [ ] Build with the actual worker and publish U4. Document real iPhone installed-PWA tests rather than assuming desktop simulation proves them.
**Acceptance:** One root registration, no missing precache assets, no unexpected notification prompts, no destructive cache sweeping.

### U5 — Pilot checks and portfolio handoff
**Files:** docs/PILOT.md, README.md, own handoff and Claude-owned fixes.
**Consumes:** Reviewed C5 integrated candidate SHA.
**Produces:** Repeatable pilot/demo script, accurate feature claims and clear remaining manual checks.
- [ ] Exercise admin + staff on two devices: create catalog/employee, start shift, open 0.5 kg with correct expiry, see remote update, finish/discard and inspect report.
- [ ] Exercise denied permission, unavailable network, reload while offline, reconnect, different account and rejected concurrent close.
- [ ] Verify Hebrew/mobile keyboard, narrow layouts, readable empty/error states and touch controls.
- [ ] Document install/update and scheduled closed-app notification checks, marking any unavailable live test as NOT RUN.
- [ ] Update README/demo with actual functioning features; publish every fix checkpoint and final U5 handoff.
**Acceptance:** A new session can reproduce the demo from docs; no unsupported claims about deployed rules, actual push or pilot success.

## Parallel execution order

| Gate | Codex | Claude | Dependency/integration |
| --- | --- | --- | --- |
| P0 | Publish shared plan and both branches | Read plan and start own clone | Same planning SHA |
| 1 | C1 identity/rules | U1 screens/navigation | U1 may test against existing exports; integrate C1 before declaring complete |
| 2 | C2 online inventory/contracts | U3 admin UI work using existing APIs | Merge published C2 into Claude before new contract imports |
| 3 | C3 offline queue | U2 inventory UI | U2 online part starts after C2; pending/provider part waits C3 |
| 4 | C4 scheduler/subscriptions | U4 service worker/PWA | Coordinate PushPayload before wiring; isolated unit tests can run in parallel |
| 5 | C5 integration/CI | Finish U3 and then U5 against pinned candidate | Codex reviews and merges passing checkpoints |

Claude may prepare visual/component tests while C1/C2 are in progress, but must not implement substitute data/security logic to avoid a dependency. Record blockers and move to an independent owned subtask.

## Handoff format (one file per agent)

```md
# <Agent> handoff
Branch:
Task / bounded subtask:
Status: not-started | in-progress | checkpoint | done | blocked
Last previously confirmed remote SHA:
Changed files:
Checks and exact results:
Known failures / NOT RUN checks:
Integrated other-agent SHA, if any:
API / dependency requests:
Next smallest action:
Commands to resume:
```

## Claude startup prompt (copy into the separate Claude session)

You are implementing TossIt UI and PWA in AlonvoDev/tossit-inventory-management.
Work only on branch claude/tossit-ui in your own clone/worktree.
First fetch the remote, check out that branch, read this entire file:
docs/superpowers/plans/2026-11-09-tossit-two-agent-delivery.md

Read the latest docs/handoff/codex.md if present. Follow the Claude file ownership, U1–U5 task order, shared contracts and Git/recovery protocol exactly. Codex owns backend/domain/security and integration. You own UI/PWA. Do not edit his files, dependencies/lockfile, main, or the shared plan; put requests in docs/CLAUDE_REQUESTS.md and your handoff.

Start with U1. Use focused regression/component tests for changed behavior. Run build and tests before each task completion; report the existing lint baseline honestly. Commit and PUSH your branch after every completed task or coherent subtask, verify the remote SHA, and update docs/handoff/claude.md in that checkpoint. Before context runs out, publish a labeled checkpoint and exact next step; never claim unpushed or failing work is complete.

Do not deploy, migrate production data, enable billing, change live roles or send invitations. Do not invent working API implementations, fake successes or a second offline queue. Merge only a pinned passing Codex checkpoint when this plan requires it. Never force-push. If push fails, report the blocker and stop starting new work.

## Release acceptance

- [ ] Official build passes, lint has zero errors, domain/rules/UI tests pass.
- [ ] Unauthenticated/cross-business/self-promotion attempts are rejected.
- [ ] Admin provisioning preserves the admin session; disabled profile is denied.
- [ ] Product-derived expiry, decimals, department/fridge scope and shift restoration are correct.
- [ ] Finished/discarded are exclusive and reports show actual recorded waste.
- [ ] Queue survives reload, retries idempotently and never crosses account/business boundaries.
- [ ] Settings persist; placeholders are removed from advertised functionality.
- [ ] One worker installs/updates correctly; real-device tests are recorded.
- [ ] Server notifications select correct slots/recipients; closed-app delivery is verified after approved deployment.
- [ ] Both handoffs point to pushed checkpoints; integrated candidate and release blockers are documented.
- [ ] The user reviews the candidate before main integration/production release.

## Estimate and limits

Planning range: roughly 35–55 combined implementer hours, with integration and real-device checks included but production setup uncertainty still present. Parallel work reduces elapsed time only where dependencies permit; do not promise a 50% time or token reduction. Re-estimate after C1/C2.

Use task-scoped reading, incremental checks after small edits, and full checks at published task gates. Do not resend entire repositories, regenerate working components, broaden feature scope or request the other worker's full conversation. The plan, Git history, tests and compact handoffs are the durable shared memory.

References:
- https://firebase.google.com/docs/functions/schedule-functions
- https://vite-pwa-org.netlify.app/guide/inject-manifest
