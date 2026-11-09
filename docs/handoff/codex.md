# Codex handoff
Branch: codex/tossit-core
Task / bounded subtask: C1 — authoritative identity and enforceable permissions
Status: done (implementation/emulator verification; NOT deployed)
Last previously confirmed remote SHA: 94a62b71affe993134f3c7a0825c16346e6219f1

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
