# Codex handoff
Branch: codex/tossit-core
Task / bounded subtask: C2 — correct online inventory and stable UI contracts
Status: done (implementation/emulator verification; NOT deployed)
Last previously confirmed remote SHA: 6401bacfe08b26769cbf3634c55f744d3a0f9a2c

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
