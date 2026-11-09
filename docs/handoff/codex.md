# Codex handoff
Branch: codex/tossit-core
Task / bounded subtask: C3c — connected offline inventory, cache and provider
Status: C3 implementation DONE; READY for Claude integration/mount. No deployment.
Last previously confirmed remote SHA: 0dc0b5040c7abaf02c7cdbd5a0378dc73453e071

## READY FOR CLAUDE — C3c supersedes earlier foundation-only status
The C3 implementation is connected and tested in the published commit containing this handoff. Merge its pinned SHA from codex/tossit-core, then mount OfflineProvider and complete U2/U4b; C4 notification controls still wait for C4.

- In src/app/main.tsx, import OfflineProvider from ../offline/OfflineProvider and mount it directly INSIDE AuthProvider, wrapping NotificationProvider/ShiftProvider/App/PWAPrompt/OfflineIndicator. This is a Claude-owned mount change; Codex has not edited the entry file.
- useOffline() is exported from src/offline/OfflineProvider.tsx and returns { operations, pendingCount, failedCount, error, retry(operationId) }. Alternatively subscribeSyncOperations(listener) retains the exact shared contract and returns an unsubscribe function. It now emits real current-account/current-business states. Connectivity and queue status are separate signals. Show pending and failed separately; a failed operation remains retained until explicit review/retry.
- openInventoryItem/closeInventoryItem retain the shared signatures and now write ahead to IndexedDB. Online acknowledgement returns synced; offline/timeout/transient transport returns pending only after durable storage. Errors such as permission-denied/invalid-input/already-closed/catalog-changed are never described as success. Generate ONE UUID per user intent and reuse the unchanged payload on retries. retrySyncOperation is additionally exported by inventoryOperations; use it for a retained failed operation after review.
- getBusinessItems/subscribeBusinessItems project durable pending and acknowledged-but-not-yet-cached changes; cache lag cannot make a synced opening disappear or resurrect a closed batch. Cached data is filtered by current verified role/department. Realtime subscriptions revoke/rebind on profile changes. Cached catalog/fridges/items require an earlier successful online load; a missing verified offline snapshot returns unavailable rather than fabricated data.
- Legacy addItem/markItem* adapters also use the durable operations, but their historical string/void results do NOT expose sync status. U2 must consume WriteReceipt/subscriptions for truthful UI feedback. Legacy adapters still generate a fresh operation intent per call; U2 should use the new APIs to preserve retry IDs.
- Remove ALL Dashboard/localStorage queue-clearing behavior and old standalone replayers. utils/syncManager is now a non-destructive compatibility facade; clearPendingOperations only quarantines source values, never clears them. The new worker must continue leaving IndexedDB/localStorage intact.
- Client cache is a last-known verified profile/data snapshot, allowing an already signed-in account to reload offline. It is not server authority: replay rechecks real profile/rules and expected UID/business. Missing/disabled/malformed known profiles fail closed; logout isolates retained pending work. Firebase Auth must still restore the same signed-in UID.
- No permission request, push subscription or worker registration was introduced by C3. C4 must use the existing app worker and agreed PushPayload.

## READY FOR CLAUDE — coordination update after U4a 1b8195a
**C2 is COMPLETE and READY TO MERGE.** The exact pinned code checkpoint is
`1f55cc4ccf58f728aa46c0a5ac99d05c449b9ca9` (includes C2a and final C2, not just types/settings).
On claude/tossit-ui: fetch origin, merge that pinned commit with a normal merge, then run the combined build/tests and continue U2 inventory and U3d settings. Full integration notes are in the C2 final section below. Do not wait for C3/C4 to integrate the online C2 work.

I fetched and read Claude U4a `1b8195a` and its requests:
- Accepted single injectManifest app worker at `/service-worker.js`, root scope. C4 must use `navigator.serviceWorker.ready`; notification helpers must never register another worker. Icons use `/icons/icon-192.png`.
- Accepted PushPayload v1 with worker runtime bounds: title1..200, body1..1000, url1..2000, tag1..200; use same-origin app paths and slot-derived tags. Worker parsing remains necessary even after importing the shared PushPayload type from domain/contracts.ts.
- C4 enable/disable stays explicit user action, using VAPID and the existing registration. No permission prompt on startup; no browser timer is the authoritative scheduler. This is acknowledged work, not implemented C4 yet.
- C3 UI source remains subscribeSyncOperations(listener) with SyncOperation[] and states pending/synced/failed. U4b can derive pendingCount as ops.filter(op => op.state === 'pending').length, separately from navigator.onLine; failed entries must not be called synced. C3c will connect this source and publish the provider/mount contract. Until then C2 correctly emits [] and rejects offline writes.
- Claude's worker cache cleanup does not touch IndexedDB/localStorage, which matches the queue persistence boundary. Legacy queues/caches remain quarantined for explicit review; do not clear Dashboard/localStorage pending operations during logout, mount or updates.
- U4a is a pinned available integration candidate for C5. It has NOT been merged/tested in the Codex clone, and Claude's reported Chromium checks are not independently rerun here. Main/live services remain unchanged.

## Delivered
- C1a f9d488f: one AuthContext and legacy hook facade; realtime profile authority, atomic UID changes, saved shift restoration, disabled/missing/malformed profile denial; no local demo authority.
- C1b 94a62b7: explicit Firestore business/department/rule validation, server-only employee administration, narrow self-shift updates, product-derived item validation and mutually exclusive terminal states.
- C1c: callable create/update/deactivate with server admin checks, deterministic idempotency receipts, disabled-before-profile account creation, cleanup/recovery for partial and ambiguous writes, per-employee activation/deactivation leases.
- Client authAPI uses callables; public signup and the self-promotion helper reject. Removed default-admin/business fallbacks. deleteUserByAdmin now means deactivate account/profile and preserve audit identity.
- ShiftContext derives actual shift state from AuthContext; a late shift operation from an old identity cannot grant the new account a shift.
- Firebase legacy module reexports one initialized service set. Explicit emulator selection connects synchronously to demo-tossit-auth and never silently falls back to production.
- Added function build/test configs and docs/RELEASE.md. No production writes, billing changes or deployment.

## Verification
- Client/UI suite: 29/29 PASS (16 session/shift, 8 authAPI, 5 existing Button).
- Server domain suite: 16/16 PASS.
- Firestore rules suite: 19/19 PASS against demo emulator.
- Actual callable HTTP/auth integration with real Firebase SDKs and local Auth/Firestore: 1/1 PASS.
- Official app build and Functions TypeScript build: PASS.
- Lint: unchanged baseline 4 errors / 7 warnings; no new lint errors. Remaining errors belong to AdminUsersPage, types/pwa.d.ts and utils/syncManager and are assigned to U3/U4/C3.
- git diff --check: PASS.
- Independent C1 review found two Important races; both reproduced RED→GREEN and fixed: stale identity during provisioning, and activation replay racing deactivation. Tests also cover lost profile-write acknowledgement and retry after failed activation.

## Claude integration (U1/U3)
Use the published final C1 checkpoint SHA, not a moving branch tip. AuthContext/hooks/useAuth provide the exact existing aliases plus userId, error, isAuthenticated, isOnShift and shiftStartedAt. Require isAuthenticated AND a valid profile for protected routes. Manager access is department-scoped, and user management is admin-only.
Public signup must show business-managed enrollment; no selectable privileged role/business. Employee deactivation must be labeled as deactivation, not physical deletion. Managers need an explicit assigned department. createUserByAdmin accepts optional CreateUserData.requestId: generate one UUID per form intent and reuse for retries. Without one the API retains an in-memory retry ID. The API binds expected actor/business internally.
Server mutations can return aborted while another operation holds a lease: show a retryable error, never success. No new UI-owned file has been edited.

## Next smallest action
C2: publish src/domain/contracts.ts and inventoryOperations/settingsAPI, normalize legacy items and scoped realtime reads, derive expiry/unit/product identity from catalog, enforce decimals and safe terminal transactions. Preserve old API adapters until Claude migrates. C3 offline and C4 scheduled push remain NOT implemented.

## Release blockers / NOT RUN
- DO NOT deploy C1 rules alone: the old inventory API still omits productId/uses local timestamps and must be migrated in C2.
- Settings/subscription/receipt collections remain denied until their owning tasks add tested grants.
- Review legacy profile fields before deployment. Missing valid business/department fails closed; no inferred business1/admin.
- Native Firebase CLI Functions worker failed Unix socket bind with EPERM in this host. Real onCall handlers were instead verified over loopback TCP against actual Auth/Firestore emulators. Worker-specific startup is NOT verified; no sandbox escalation was used.
- Functions target Node 22; host tests ran Node 24. Node 22 CI validation is a release check.
- Live Firebase rules, production sign-in/provisioning, mobile PWA and push are NOT verified. No production changes.

## Rulings and persistence
- Existing Codex-only clone/branch is isolated from Claude's clone; tracked handoff is durable and a scoped scratch ledger records RED/GREEN steps.
- CLI Git has no write credentials; publish verified trees/commits through authenticated GitHub tools with an expected-parent, non-force branch update. Reconcile identical local tree and verify remote SHA after every checkpoint.
- Employee removal means audited deactivation; malformed profiles need reviewed repair. If those policies do not suit the business, adjust explicitly before release, not through client bypasses.

## Resume
Fetch origin, verify codex/tossit-core and a clean working tree, read the shared plan and this handoff, then begin C2. Never edit Claude-owned files, main or production services. Every completed task/subtask requires commit + push + remote-SHA verification.

## Coordination response to Claude checkpoint a0e110e (U3c)
Pinned code checkpoint ready to merge: 70d953e21a8b70c6b46d1fbddc6b01226e78f26e.
- U1 requests 1–5: implemented. Manager fridges are allowed within their department; user management/settings remain admin-only.
- U3b manager department, session-safe create, profile update, deactivation and self-protection: implemented. Existing create/update/deleteUserByAdmin signatures are compatible; delete is audited deactivation. Functions errors use the SDK prefix (functions/permission-denied, functions/invalid-argument, functions/already-exists, functions/aborted, functions/unavailable). Aborted is a retryable lease conflict.
- Reactivation is NOT exposed by C1. Do not show a working reactivate control yet. This new request needs a separate tested lifecycle operation before U3b claims reactivation support; old creation replay explicitly cannot reactivate a disabled employee.
- U3c scoped catalog queries and U3a scoped report aggregation/reason filtering belong to C2 and are acknowledged as its next work. Do not add UI-side substitutes or relax rules.
- Product display codes remain display-only; Firestore document IDs are authoritative. A business-wide uniqueness guarantee is not currently promised.
- Legacy catalog queue/cache keys are included in the planned C3 import/review; never silently discard them.
- Shared department normalization will be published in C2. Current C1 parser already normalizes Hebrew profile values, but it is not the shared UI/item utility yet.
No Claude-owned files were edited, merged or overwritten. Read the handoff and merge the pinned passing C1 code checkpoint, then run your U1/U3 checks.

## C2a checkpoint — contracts, inventory domain and business settings
Status: bounded subtask DONE; C2 overall remains IN PROGRESS. Base: 90dc45f5c90c969d6c8f85711d26b55a29026a31.
- Added src/domain/contracts.ts with the exact shared C2/C3/C4 interfaces and an InventoryItem read model. UI may import normalizeDepartment from src/domain/normalizeItem.ts (canonical and legacy Hebrew).
- Pure buildInventoryItem derives name/unit/expiry from the catalog, supports decimal kg, rejects fractional units, off-shift staff, wrong-business/department catalog and fridges, malformed operation IDs and future opening times. Pure buildClosePatch validates exclusive terminal actions and authoritative audit identity. These helpers are NOT connected to old inventory APIs yet.
- normalizeItem preserves audit timestamps, discard quantity/reason and finished attribution; handles native/serialized Timestamp and old ISO caches without inventing expiry.
- src/api/settingsAPI.ts now exports getBusinessSettings(): Promise<BusinessSettings> and saveBusinessSettings(input): Promise<void>. No businessId argument: both derive the active server profile. Defaults: Asia/Jerusalem, evening=true, morning=true, autoEndShiftsAtMidnight=false. Admin-only saves await server acknowledgement; real errors propagate. No scheduler exists yet.
- src/api/access.ts offers authoritative getCurrentActor/assertCurrentActor and business/department query constraints for C2b. The old catalog/inventory reads have NOT migrated yet.
- Added explicit tested businessSettings/{businessId} rules: active same-business reads including absent defaults; only admin exact validated four-field create/update; no deletes.
- Verification: new 24 client/domain/API tests pass; full client suite 53/53 PASS; rules emulator 21/21 PASS; official app build PASS; lint on all changed TS files PASS; git diff --check PASS. RED stages confirmed before implementations. Independent static review: no Critical/Important findings.
- Claude checkpoint fd21795 integrated C1 and has 101 passing combined client tests. U3d is now unblocked by settingsAPI. Merge the pinned C2a commit published with this handoff; do not take a later moving WIP tip.
- Still required in C2b: actual inventoryOperations exports and online receipts, terminal transaction/idempotency rules, scoped catalog/inventory/report/realtime adapters, productCategories rule alignment, real SDK emulator integration. Do NOT claim C2 done or deploy current strict rules with old item APIs.
- C3 durable offline and C4 scheduling/push remain unimplemented. Existing legacy cache/queue records are untouched.

## C2 final checkpoint — supersedes earlier C2-pending notes
Status: C2 DONE (local/demo-emulator verification, NOT deployed). Pinned base C2a: 6401bacfe08b26769cbf3634c55f744d3a0f9a2c.

### Claude integration contract
- src/api/inventoryOperations.ts exports openInventoryItem, closeInventoryItem, subscribeSyncOperations with the exact shared contracts. Generate a UUID once per user intent and reuse input unchanged on retry. Both writes resolve state=synced only after server acknowledgement or verification of an identical prior write. Offline rejects unavailable; subscribeSyncOperations reports [] until C3 implements the durable queue, not fabricated pending work.
- Open document ID equals operationId; persists productId, catalog name/unit, authoritative actor/business, canonical area, quantity, opening/expiry Timestamp, false terminal flags and optional fridgeId. Expiry uses catalog shelfLifeDays × 24h. An already acknowledged opening remains retriable if the catalog later changes/disappears. A different payload with the same opening ID rejects invalid-input.
- Close uses a transaction, closedOperationId and serverTimestamp for finishedAt/discardedAt. Audit UID/name derive from the active server profile. A same-item same-ID retry is acknowledged; changed intent with same ID rejects invalid-input; another action on the closed batch rejects already-closed. Concurrent finish/discard produces exactly one winner. Close idempotency is scoped to (itemId, operationId); this stage does not promise a globally unique receipt namespace across different batches/endpoints. C3 must bind its queue IDs to immutable payloads.
- Partial discard closes the whole tracked batch. discardedQuantity records waste only; no remaining active batch is implied.
- Existing firestoreAPI exports remain; raw updateItem/deleteItem explicitly reject audit rewriting/deletion. Legacy addItem uses the actual catalog, never the caller's display name/type/expiry. Legacy adapters generate a new intent per call; U2 should use the new operations API to retain IDs across retries.
- getBusinessItems/getAreaItems/getDiscardedItems/getFinishedItems and report functions now use actor-scoped server queries and normalize legacy audit data. getBusinessProducts and getBusinessFridges constrain department in Firestore, not only in UI, and normalize Hebrew departments. Real permission/network errors propagate. Removed localStorage fallback/fake receipts from these APIs; no legacy keys were deleted.
- Returned area/department values are canonical bar/kitchen. Item.area remains string in the legacy export for source compatibility, but U2 must normalize filter values instead of comparing canonical data with Hebrew labels. Shared normalizeDepartment is src/domain/normalizeItem.ts.
- subscribeBusinessItems(businessId, listener, onError) is now exported by firestoreAPI: scoped realtime inventory, disposed/session-changed callbacks suppressed. U2 can subscribe rather than refetching after actions.
- getDiscardReport and getDiscardedItemsWithDateFilter accept optional fourth reason argument. Bounds are inclusive instants supplied by the UI. Bounded reports exclude legacy missing discardedAt instead of inventing the opening date as a discard date. Unbounded history retains those records without a lastDiscarded claim. Group by product identity and unit, never combine kg and units.
- productCategories now has the actual admin-only mutation/business read rules; legacy categories retained. Category actor is derived, not accepted from the form. Catalog manager mutations remain department scoped; product whole-day shelf life 1..3650, immutable unit in the API, product fridge membership validated. Display product codes are not a unique identity guarantee.
- settingsAPI and contracts from C2a remain unchanged; U3d is unblocked.

### C2 verification
- Full app client suite: 55/55 PASS (7 files).
- Real Firestore SDK + rules emulator: 35/35 PASS (22 authorization + 13 inventory/catalog/realtime/report integration cases).
- Official Vite/PWA app build: PASS; final TypeScript check PASS. Existing bundle/browserslist warnings remain.
- ESLint on every changed TS file: PASS. git diff --check: PASS.
- RED→GREEN demonstrated for missing modules, settings rules, old legacy inventory/scoped queries/reports, actual category collection, catalog-deleted retry, and forged opposite-action audit fields.
- Independent static review completed. The reviewer suggested global cross-item operation receipts; inspected shared plan and retained item-scoped close idempotency as documented above, deferring global queue payload binding to C3. Same-item changed-payload retries are tested and rejected. No unresolved data-loss/permission finding identified.
- These checks do not rerun/deploy C1 server functions; C1 verification remains documented above. No production data, main or Claude-owned files changed.

### Next / remaining release gates
C3: IndexedDB queue/cache, account/business isolation, stable immutable payloads, replay locks across tabs, explicit conflicts/catalog-changed handling and non-destructive legacy queue review/import. Existing utils/syncManager.ts is unused legacy code and must be replaced, not activated.
C4: server scheduling/push, one Claude-owned service worker. Legacy api/expirationChecker browser timers remain a C4 migration target and are not proof of working scheduled/closed-app notifications. C5: merge pinned tested branches and validate the integrated application before any deployment.
Claude may now integrate U2 online inventory and U3d settings from the published C2 commit. Do not deploy just by merging it; mobile flows, offline, scheduling and combined-branch validation remain pending.

## C3a checkpoint — durable storage foundation (C3 still IN PROGRESS)
Base C2 published and remotely verified: 1f55cc4ccf58f728aa46c0a5ac99d05c449b9ca9. Claude can merge this pinned C2 SHA for U2/U3d now.
- src/offline/queueStore.ts adds an IndexedDB-backed queue/cache with explicit uid/business keys, immutable operation payload binding, atomic cross-tab replay leases, token-checked acknowledgement/release, failed-conflict retention and explicit retry. Completed operations remain recorded for idempotency.
- A transaction commits before enqueue resolves. A quota/write failure rejects and leaves no partial operation or sequence increment. Operation order uses a durable transactional sequence, including open/close requests created in the same millisecond.
- Reopening the database preserves payload/opening instant, status and replay attempts. Expired leases can be reclaimed; stale workers cannot acknowledge another worker's lease. Use a fresh lease token for every claim, not a reused tab identifier.
- Legacy quarantine copies raw corrupt/unattributed records for later explicit review, deduplicates identical snapshots, never assigns them to the current user, deletes nothing and queues none for automatic replay. listLegacyReviews is an internal recovery API; do not expose raw unattributed values to arbitrary signed-in users.
- Added fake-indexeddb as a dev-only dependency to exercise actual IndexedDB transaction semantics in the test host.
- Verification: 10 storage tests PASS, including reload, two accounts/businesses, two tabs, interrupted lease, retained catalog-changed conflict, retry, cache, legacy corruption, quota failure and same-millisecond FIFO. Full client suite65/65 PASS; official app build PASS; changed-file lint PASS; git diff --check PASS. FIFO regression was observed RED→GREEN.
- This is a foundation checkpoint only: inventoryOperations still uses C2 online-only behavior. No OfflineProvider, replay worker, online-cache integration or UI pending state is connected yet. Do NOT advertise working offline inventory from C3a. Next: implement and test replay/session lifecycle, connect inventory APIs/cache/subscriptions, publish provider contract for Claude to mount and remove Dashboard queue-clearing behavior.

## C3b checkpoint — replay foundation (C3 still IN PROGRESS)
Base C3a published/remotely verified: 8eeaf29424eb8c8aa60b38016a323c573b59fb32.
- src/offline/replay.ts drains only the active UID/business queue, uses a fresh token per lease claim, checks session/connectivity after asynchronous boundaries, validates exact synced operation/item receipts, and retains original intent payloads.
- A real server acknowledgement lookup runs BEFORE catalog comparison, so a committed-but-lost-ack write can recover even after a later catalog change. New writes compare captured catalog configuration; stale config becomes retained catalog-changed instead of silently regenerating expiry.
- Transient network/auth/lease errors release to pending and stop for a later trigger. Permission, closed-batch, shift and catalog conflicts remain failed with their code and immutable payload. Logout/account change during a request leaves the original intent pending; a later matching account verifies/retries it idempotently.
- ReplayOptions deliberately injects real server acknowledgement/catalog/execution services. The execution adapter MUST bind expected UID/business internally across its own awaits; the runner's checks are additional defenses, not server authority. Integration is not provided by a blind call to an API under a subsequently signed-in account.
- Fixed a storage ownership race, reproduced RED→GREEN: enqueue retained a mutable caller scope across database opening. All scoped store operations now capture their keys/owner before awaiting storage. No action can migrate to a mutated caller account object.
- Verification: 11 storage + 13 replay tests PASS; full client suite79/79 PASS (9 files); app build + TypeScript PASS; lint all changed TS files PASS; git diff --check PASS. Lost-ack/catalog-change recovery also observed RED→GREEN. Fresh independent storage/replay review reported no Critical/Important findings; subsequent mutable-scope regression was reproduced and fixed with tests.
- Storage tests use fake-indexeddb in the test host. Replay transport is injected/stubbed. These are not real-browser persistence, network toggling or live Firestore replay claims. C2's real SDK/emulator verification remains separately recorded.

### Resume C3c — connect the tested foundations
1. Keep C2's actual online implementations separately callable and add an expected-scope guard inside them. Wire replay's server lookup/catalog/execution adapters against those guarded operations, never recursively against an offline wrapper.
2. Add account-scoped durable verified-profile/catalog/item caches. Only explicit offline/unavailable conditions may use them; permission errors must not become cache success. Filter cached values against the current profile's role/department and invalidate known disabled/malformed profiles.
3. Connect inventoryOperations: validate against captured catalog/item before durable enqueue; return pending only after committed storage; preserve opening instants/configuration; enqueue online transport failures only when the original intent snapshot is retained, never permission/validation failures. Surface failed operations via subscriptions. Scope every asynchronous notification to the current account/business.
4. Publish OfflineProvider/lifecycle contract for Claude to mount (Claude owns app entry/UI). Subscribe to session/connectivity, safe cross-tab triggers, no background old-account replay after logout. Feed canonical cached/pending inventory to subscribers. Replace unused legacy syncManager with adapters that preserve/quarantine old keys; do not activate the old destructive replayer.
5. Test browser/API-facing offline reload/replay, logout/re-login/account changes, stale catalogs, interrupted writes and provider cleanup with actual adapters; then mark C3 complete and ask Claude to remove Dashboard queue clearing and wire pending/failed UI. C3a/C3b alone do NOT enable offline inventory in the app.
C4 scheduled push and C5 integrated candidate remain untouched.

## C3c final verification and release boundary
- Full client suite: 95/95 PASS (11 files). Store schema1→2 upgrade preserves pending operations and ordering. Tests cover cached profile/shift restore, pending counts/logout, account changes, immutable retry intent, expired hanging worker recovery, lost acknowledgements, catalog changes, validation and retained conflicts.
- Actual Firestore SDK/rules emulator suite: 41/41 PASS (22 authorization, 19 inventory/catalog/report/realtime/offline cases). Includes offline open→storage reopen→one actual server batch, offline discard with server audit fields, legacy adapter replay, changed-catalog rejection, freshly narrowed cached projection and live subscription revoke/rebind.
- App build and TypeScript: PASS. Changed-file lint: zero errors, two Fast Refresh warnings (AuthContext existing pattern and new OfflineProvider hook export). Whole Codex branch lint is now2errors/8warnings: the two remaining errors are Claude-owned AdminUsersPage and pwa.d.ts, already fixed on Claude's branch. No lint suppression added.
- Independent review identified two Important issues: acknowledged overlays disappearing during cache lag and stale profile privileges on cached realtime publication. Both were reproduced RED→GREEN and fixed, including live emulator subscription coverage. Additional regressions fixed RED→GREEN: shift Timestamp JSON restoration, expired hanging in-flight worker, same-UID late cached-profile overwrite. Scope and lifetime guards suppress late callbacks after disposal/account change.
- Codex fetched Claude checkpoint8f461c2: C2 integration and U3d completed there. No Claude-owned files were edited or merged here. C3 is now the next pinned merge/mount gate for U2/U4b.
- NOT RUN: real browser/device IndexedDB eviction/quota/private-mode behavior, offline sign-in/reload/replay UI, tab lifecycle/update across both merged branches, real iPhone/Android. Pure storage uses fake-indexeddb; Firebase integration uses real SDK/emulator plus the IndexedDB test implementation. The current Codex build still uses its old PWA config until C5 integrates Claude U4a; don't confuse it with the reviewed single-worker candidate on Claude's branch.
- Remaining release work: Claude mount/U2/U4b integration and device pilot; C4 server scheduling/WebPush; C5 pinned-branch integration, full validation and deployment review. No live site, main, Firebase rules/functions or billing changes.

## C4a — server scheduling and device foundations (C4 IN PROGRESS)
- Added server-only upsertPushDevice/revokePushDevice/getPushDeviceStatus callables. Registration derives active actor/business, checks the expected session and atomically binds a per-device capability + binding ID. Subscription endpoints are restricted to supported HTTPS push vendors and real P256/auth key shapes. A token/binding-scoped revoke works after logout; an old revoke cannot disable a newer opt-in. Endpoint claims prevent binding one endpoint to different device IDs; max10enabled devices per user.
- Added scheduledInventoryNotifications: one Cloud Scheduler job (0,20,40 at hours0,8,23 in Asia/Jerusalem); pure slot selection filters to23:00/23:20/23:40 staff reminders,08:00 admin/manager summary,00:00 optional shift ending. One fixed deployment timezone; no browser timers.
- Recipients/settings/remaining expired open items are rechecked before dispatch; managers remain department scoped, admins business wide. Morning summary includes all currently overdue unhandled items. Generic text contains a count, no product/employee/business names. Payload matches shared PushPayloadv1 and existing worker bounds/path. Stable per-slot tags + durable per-device/user claims suppress confirmed duplicates. Delivery acknowledgement is push-service acceptance, not proof of phone display; an ambiguous transport/crash retry can replace the same tag and cannot promise external exactly-once delivery.
- 404/410 disables only the matching binding; transient/auth/rate-limit/provider failures retain retry state. A six-minute fencing lease exceeds the scheduled function's five-minute timeout. Records have expiresAt for optional14dayTTL cleanup (not configured/deployed).
- Midnight shift ending is default-off and rechecks actual business setting/profile per transaction. It only ends a saved shift whose server start is at/before the scheduled midnight; duplicate/late jobs cannot end a newly started shift. Legacy missing start times are skipped for review.
- Real transport uses web-push with WEB_PUSH_VAPID_PUBLIC_KEY, secret WEB_PUSH_VAPID_PRIVATE_KEY and WEB_PUSH_CONTACT; TTL600s/socket timeout10s. No keys generated/saved/deployed; server collections remain client-denied under existing default-deny rules.
- Verification: server domain39/39 PASS (23push+16users); functions build PASS; real callable HTTP/Auth/Firestore integration3/3 PASS, including endpoint/device capability enforcement, signed-out revoke, stale-binding fence, concurrent delivery claims and opt-in midnight/new-shift protection. Actual network push transport is stubbed; native Functions worker limitations fromC1 remain.
- C4 is NOT ready for U4c yet: next add client enable/disable/status/session cleanup and remove old browser notification/timer paths. Claude meanwhile can integrate C3 pinned89920b2 for U2/U4b.
