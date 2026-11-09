# Codex handoff
Branch: codex/tossit-core
Task / bounded subtask: C1b — emulator-tested business and department authorization
Status: checkpoint (C1 is still in progress)
Last previously confirmed remote SHA: f9d488f154a24e7063a68441b09f614ae1995cf8

## Delivered
- One AuthContext; hooks/useAuth is now a facade with userId and all existing aliases.
- Profile snapshots drive role, active status and saved shift state.
- UID changes/sign-out atomically revoke the previous profile; late callbacks are ignored.
- Missing/disabled/malformed profiles grant no client authority; no business1 or local demo authority fallback in the context.
- Legacy role=user becomes staff and Hebrew departments normalize safely. Existing profiles without a valid business/department need administrator repair, never invented authority.
- Added optional UserProfile.isActive; missing means legacy-active, false denies access.
- Added rules-unit-testing dev dependency for the next C1 emulator subtask.

## Verification
- Regression RED against baseline: 10 failures / 1 pass.
- Updated full suite: 19/19 PASS (14 session tests and existing 5 Button tests).
- npm run build: PASS, including worker generation.
- npm run lint: existing 4 errors / 7 warnings; no new lint errors.
- git diff --check: PASS after whitespace cleanup.

## Claude integration
The identity contract is available for U1: useAuth exposes user/currentUser, profile/userProfile, uid/userId, loading/isLoading, isAuthenticated, role flags, businessId, isOnShift and shiftStartedAt. It also exposes error for unavailable profile data. Require isAuthenticated and a profile for protected routes; a Firebase User by itself is insufficient. Do not merge a moving tip: use this completed checkpoint SHA reported by Codex.

## Not delivered / next steps
C1 remains IN PROGRESS: Firestore rules are still the old permissive rules, privileged authAPI fallbacks/signup are not yet removed, server provisioning is not yet implemented. This checkpoint fixes client consistency, not server security. Production and real-device tests NOT RUN. No deployment or live writes.
Next: emulator-backed rules tests and restrictive authorization, then callable provisioning/deactivation and authAPI cleanup.

## Rulings
Use the existing Codex-only clone on codex/tossit-core; Claude uses a separate clone. Keep a compact tracked handoff plus a scoped scratch ledger instead of unavailable local skill shell helpers. Session regression tests use .tsx because they render actual consumers.

## C1b checkpoint
- Replaced permissive Firestore grants with business/department scope, server-only profile administration, narrow self-shift updates, validated product/fridge writes, product-derived item creation and exclusive terminal actions.
- New rules suite runs only against demo-tossit-auth emulator; no production fallback. Ordinary UI/unit tests exclude emulator-only suites.
- RED: 18 failed / 1 passed against old rules. GREEN: 19/19 emulator tests pass. Client suite 19/19 passes; official build passes; lint remains 4 existing errors and 7 warnings.
- Rules are NOT DEPLOYED. C1 is not complete: existing authAPI needs callable provisioning and serverTimestamp shift writes; C2 inventory adapters must emit validated productId and terminal fields before deployment.
- Root deployment configuration has not changed. Bootstrap existing business admins via a trusted release procedure; never reopen rules for setup.
- Command-line push lacked credentials; checkpoints are published through the authenticated GitHub connection as one tree/commit with a non-force, expected-parent ref update, then verified and synchronized locally.
Next smallest action: C1c callable user provisioning/deactivation, client authAPI cleanup and tests.
